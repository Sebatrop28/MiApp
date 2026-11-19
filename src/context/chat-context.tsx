import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { iceServers } from '@/config/firebase-config';
import { useFriends } from '@/context/friends-context';
import { decodeWire, encodeWire, ImageAssembler, MAX_MESSAGE_LENGTH, splitChunks } from '@/services/chat-protocol';
import { imagesSupported, prepareImage, readImageBase64, saveReceivedImage } from '@/services/chat-media';
import { createFirestoreSignaling } from '@/services/chat-signaling';
import {
  addReceived,
  createMessageId,
  loadMessages,
  markDelivered,
  pendingMessages,
  saveMessages,
  type ChatMessage,
} from '@/services/chat-storage';
import { getFirebaseDb } from '@/services/firebase';
import { PeerSession, type IncomingCall, type Signaling } from '@/services/p2p';
import { getPeerConnectionConstructor } from '@/services/webrtc';

export type ConnectionState = 'idle' | 'connecting' | 'open';

export interface ChatContextValue {
  /** `false` en Expo Go: WebRTC necesita el APK. */
  supported: boolean;
  conversations: Record<string, ChatMessage[]>;
  connections: Record<string, ConnectionState>;
  error: string | null;
  /** Carga el historial guardado en el teléfono. */
  openConversation: (friendUid: string) => void;
  /** Intenta conectar directamente con el teléfono del amigo (debe tener la app abierta). */
  connect: (friendUid: string) => void;
  /** Guarda el mensaje y lo envía en cuanto haya conexión. */
  sendMessage: (friendUid: string, text: string) => void;
  /** `false` en web: las imágenes necesitan el sistema de archivos del teléfono. */
  imagesSupported: boolean;
  /** Comprime la imagen elegida, la guarda en el teléfono y la envía al conectar. */
  sendImage: (friendUid: string, image: { uri: string; width: number; height: number }) => Promise<void>;
  dismissError: () => void;
}

/** Ofertas más viejas que esto se ignoran: quien llamaba ya se rindió. */
const CALL_TTL_MS = 60_000;

const ChatContext = createContext<ChatContextValue | null>(null);

export interface ChatProviderProps extends PropsWithChildren {
  userId: string;
  /** Inyectable para pruebas. */
  signaling?: Signaling;
}

export function ChatProvider({ userId, signaling: injected, children }: ChatProviderProps) {
  const { friends, profile } = useFriends();
  const PeerConnection = useMemo(() => getPeerConnectionConstructor(), []);
  const signaling = useMemo(() => injected ?? createFirestoreSignaling(getFirebaseDb()), [injected]);
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const [connections, setConnections] = useState<Record<string, ConnectionState>>({});
  const [error, setError] = useState<string | null>(null);

  const conversationsRef = useRef<Record<string, ChatMessage[]>>({});
  const loading = useRef(new Map<string, Promise<void>>());
  const saveQueue = useRef(new Map<string, Promise<void>>());
  const sessions = useRef(new Map<string, PeerSession>());
  const answered = useRef(new Set<string>());
  const friendUids = useMemo(() => new Set(friends.map((f) => f.profile.uid)), [friends]);
  const friendUidsRef = useRef(friendUids);
  useEffect(() => {
    friendUidsRef.current = friendUids;
  }, [friendUids]);

  const setConnection = useCallback((uid: string, state: ConnectionState) => {
    setConnections((prev) => (prev[uid] === state ? prev : { ...prev, [uid]: state }));
  }, []);

  const ensureLoaded = useCallback(
    (uid: string) => {
      let promise = loading.current.get(uid);
      if (!promise) {
        promise = loadMessages(userId, uid)
          .catch(() => [] as ChatMessage[])
          .then((stored) => {
            // Si llegaron mensajes mientras se cargaba, se combinan.
            const current = conversationsRef.current[uid] ?? [];
            const merged = current.reduce(addReceived, stored);
            conversationsRef.current = { ...conversationsRef.current, [uid]: merged };
            setConversations(conversationsRef.current);
          });
        loading.current.set(uid, promise);
      }
      return promise;
    },
    [userId],
  );

  const update = useCallback(
    async (uid: string, change: (messages: ChatMessage[]) => ChatMessage[]) => {
      await ensureLoaded(uid);
      const before = conversationsRef.current[uid] ?? [];
      const after = change(before);
      if (after === before) return;
      conversationsRef.current = { ...conversationsRef.current, [uid]: after };
      setConversations(conversationsRef.current);
      const previous = saveQueue.current.get(uid) ?? Promise.resolve();
      const next = previous
        .then(() => saveMessages(userId, uid, conversationsRef.current[uid] ?? []))
        .catch(() => setError('No se pudo guardar el chat en el teléfono.'));
      saveQueue.current.set(uid, next);
      await next;
    },
    [ensureLoaded, userId],
  );

  /** Mensajes que se están enviando por cada conexión, para no mandarlos dos veces a la vez. */
  const inFlight = useRef(new WeakMap<PeerSession, Set<string>>());

  const transmit = useCallback(async (session: PeerSession, m: ChatMessage) => {
    const sending = inFlight.current.get(session) ?? new Set<string>();
    inFlight.current.set(session, sending);
    if (sending.has(m.id) || !session.isOpen) return;
    sending.add(m.id);
    try {
      if (!m.image) {
        session.send(encodeWire({ t: 'msg', id: m.id, text: m.text, sentAt: m.sentAt }));
        return;
      }
      const chunks = splitChunks(await readImageBase64(m.image.uri));
      const header = { t: 'img' as const, id: m.id, sentAt: m.sentAt, width: m.image.width, height: m.image.height, chunks: chunks.length };
      if (!(await session.sendWhenReady(encodeWire(header)))) return;
      for (let i = 0; i < chunks.length; i++) {
        if (!(await session.sendWhenReady(encodeWire({ t: 'chunk', id: m.id, i, data: chunks[i] })))) return;
      }
    } catch {
      setError('No se pudo enviar la imagen. Se reintentará al volver a conectar.');
    } finally {
      sending.delete(m.id);
    }
  }, []);

  const flush = useCallback(
    async (uid: string) => {
      await ensureLoaded(uid);
      const session = sessions.current.get(uid);
      if (!session?.isOpen) return;
      for (const m of pendingMessages(conversationsRef.current[uid] ?? [], userId)) {
        await transmit(session, m);
      }
    },
    [ensureLoaded, userId, transmit],
  );

  const createSession = useCallback(
    (uid: string) => {
      if (!PeerConnection) return null;
      const assembler = new ImageAssembler();
      // Se confirma después de guardar, para no perder mensajes si la app se cierra.
      const receive = (received: ChatMessage) =>
        void update(uid, (messages) => addReceived(messages, received)).then(() =>
          session.send(encodeWire({ t: 'ack', ids: [received.id] })),
        );
      const session: PeerSession = new PeerSession(
        { PeerConnection, iceServers, signaling },
        {
          onOpen: () => {
            setConnection(uid, 'open');
            void flush(uid);
          },
          onMessage: (data) => {
            const wire = decodeWire(data);
            if (!wire) return;
            if (wire.t === 'msg') {
              receive({ id: wire.id, from: uid, text: wire.text, sentAt: wire.sentAt, status: 'delivered' });
            } else if (wire.t === 'img') {
              assembler.start(wire);
            } else if (wire.t === 'chunk') {
              const complete = assembler.add(wire);
              if (!complete) return;
              const { header, base64 } = complete;
              saveReceivedImage(userId, uid, header.id, base64)
                .then((imageUri) =>
                  receive({
                    id: header.id,
                    from: uid,
                    text: '',
                    sentAt: header.sentAt,
                    status: 'delivered',
                    image: { uri: imageUri, width: header.width, height: header.height },
                  }),
                )
                .catch(() => setError('No se pudo guardar una imagen recibida.'));
            } else {
              void update(uid, (messages) => markDelivered(messages, wire.ids, userId));
            }
          },
          onClose: () => {
            assembler.clear();
            if (sessions.current.get(uid) === session) {
              sessions.current.delete(uid);
              setConnection(uid, 'idle');
            }
          },
        },
      );
      sessions.current.get(uid)?.close();
      sessions.current.set(uid, session);
      setConnection(uid, 'connecting');
      return session;
    },
    [PeerConnection, signaling, flush, update, userId, setConnection],
  );

  const connect = useCallback(
    (uid: string) => {
      if (!friendUids.has(uid)) return;
      const existing = sessions.current.get(uid);
      if (existing && !existing.isClosed) return;
      void createSession(uid)?.call(userId, uid);
    },
    [createSession, userId, friendUids],
  );

  // Ofertas de amigos que quieren conectar con este teléfono.
  useEffect(() => {
    if (!PeerConnection || !profile) return;
    return signaling.subscribeToIncoming(
      userId,
      (calls: IncomingCall[]) => {
        for (const call of calls) {
          const key = `${call.id}:${call.createdAt}`;
          if (answered.current.has(key)) continue;
          if (Date.now() - call.createdAt > CALL_TTL_MS || !friendUidsRef.current.has(call.from)) {
            answered.current.add(key);
            void signaling.deleteCall(call.id);
            continue;
          }
          const existing = sessions.current.get(call.from);
          // Si los dos llamaron a la vez, gana la oferta del uid menor.
          if (existing && !existing.isClosed && (existing.isOpen || userId < call.from)) continue;
          answered.current.add(key);
          void createSession(call.from)?.answer(call);
        }
      },
      () => setError('No se pudo escuchar las conexiones entrantes del chat.'),
    );
  }, [PeerConnection, profile, signaling, userId, createSession]);

  // Al abrir la app, reintenta enviar lo que quedó pendiente.
  useEffect(() => {
    const retryPending = () => {
      friendUidsRef.current.forEach((uid) => {
        void ensureLoaded(uid).then(() => {
          if (pendingMessages(conversationsRef.current[uid] ?? [], userId).length > 0) connect(uid);
        });
      });
    };
    retryPending();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') retryPending();
    });
    return () => subscription.remove();
  }, [friendUids, ensureLoaded, connect, userId]);

  // Cierra la conexión con quien deja de ser amigo y todas al salir.
  useEffect(() => {
    sessions.current.forEach((session, uid) => {
      if (!friendUids.has(uid)) session.close();
    });
  }, [friendUids]);

  useEffect(() => {
    const open = sessions.current;
    return () => open.forEach((session) => session.close());
  }, []);

  const sendMessage = useCallback(
    (uid: string, text: string) => {
      const trimmed = text.trim().slice(0, MAX_MESSAGE_LENGTH);
      if (!trimmed) return;
      const message: ChatMessage = { id: createMessageId(), from: userId, text: trimmed, sentAt: Date.now(), status: 'pending' };
      void update(uid, (messages) => [...messages, message]).then(() => {
        const session = sessions.current.get(uid);
        if (session?.isOpen) void transmit(session, message);
        else connect(uid);
      });
    },
    [update, connect, userId, transmit],
  );

  const sendImage = useCallback<ChatContextValue['sendImage']>(
    async (uid, source) => {
      const id = createMessageId();
      const image = await prepareImage(userId, uid, id, source);
      const message: ChatMessage = { id, from: userId, text: '', sentAt: Date.now(), status: 'pending', image };
      await update(uid, (messages) => [...messages, message]);
      const session = sessions.current.get(uid);
      if (session?.isOpen) void transmit(session, message);
      else connect(uid);
    },
    [update, connect, userId, transmit],
  );

  const openConversation = useCallback((uid: string) => void ensureLoaded(uid), [ensureLoaded]);
  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<ChatContextValue>(
    () => ({
      supported: PeerConnection !== null,
      conversations,
      connections,
      error,
      openConversation,
      connect,
      sendMessage,
      imagesSupported,
      sendImage,
      dismissError,
    }),
    [PeerConnection, conversations, connections, error, openConversation, connect, sendMessage, sendImage, dismissError],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
}

export function useChat(): ChatContextValue {
  const context = use(ChatContext);
  if (!context) throw new Error('useChat debe usarse dentro de <ChatProvider>.');
  return context;
}

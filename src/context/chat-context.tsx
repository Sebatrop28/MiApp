import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { iceServers } from '@/config/firebase-config';
import { useFriends } from '@/context/friends-context';
import { decodeWire, encodeWire, MAX_MESSAGE_LENGTH } from '@/services/chat-protocol';
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

  const flush = useCallback(
    async (uid: string) => {
      await ensureLoaded(uid);
      const session = sessions.current.get(uid);
      if (!session?.isOpen) return;
      for (const m of pendingMessages(conversationsRef.current[uid] ?? [], userId)) {
        session.send(encodeWire({ t: 'msg', id: m.id, text: m.text, sentAt: m.sentAt }));
      }
    },
    [ensureLoaded, userId],
  );

  const createSession = useCallback(
    (uid: string) => {
      if (!PeerConnection) return null;
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
              const received: ChatMessage = { id: wire.id, from: uid, text: wire.text, sentAt: wire.sentAt, status: 'delivered' };
              // Se confirma después de guardar, para no perder mensajes si la app se cierra.
              void update(uid, (messages) => addReceived(messages, received)).then(() =>
                session.send(encodeWire({ t: 'ack', ids: [wire.id] })),
              );
            } else {
              void update(uid, (messages) => markDelivered(messages, wire.ids, userId));
            }
          },
          onClose: () => {
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
        if (session?.isOpen) session.send(encodeWire({ t: 'msg', id: message.id, text: message.text, sentAt: message.sentAt }));
        else connect(uid);
      });
    },
    [update, connect, userId],
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
      dismissError,
    }),
    [PeerConnection, conversations, connections, error, openConversation, connect, sendMessage, dismissError],
  );

  return <ChatContext value={value}>{children}</ChatContext>;
}

export function useChat(): ChatContextValue {
  const context = use(ChatContext);
  if (!context) throw new Error('useChat debe usarse dentro de <ChatProvider>.');
  return context;
}

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { isPublicKey, type Sealed } from './chat-crypto';

/**
 * Buzón temporal para cuando el amigo no tiene la app abierta. Solo guarda mensajes
 * cifrados de extremo a extremo y el destinatario los borra en cuanto los recibe.
 *
 * relay/{from_to_msgId_part}  { from, to, msgId, part, parts, nonce, data, createdAt }
 * profiles/{uid}.publicKey     llave pública del chat (base64)
 */
export const RELAY_PART_SIZE = 900_000;
export const MAX_RELAY_PARTS = 8;

export interface RelayPart {
  id: string;
  from: string;
  to: string;
  msgId: string;
  part: number;
  parts: number;
  nonce: string;
  data: string;
}

export interface RelayedMessage {
  from: string;
  msgId: string;
  sealed: Sealed;
  /** ids de los documentos que hay que borrar al recibirlo. */
  ids: string[];
}

export interface Relay {
  publish(from: string, to: string, msgId: string, sealed: Sealed): Promise<void>;
  subscribeIncoming(uid: string, callback: (messages: RelayedMessage[]) => void, onError: () => void): Unsubscribe;
  /** Mensajes propios que siguen en el buzón, por destinatario (solo datos confirmados por el servidor). */
  subscribeOutgoing(uid: string, callback: (waiting: Map<string, Set<string>>) => void, onError: () => void): Unsubscribe;
  remove(ids: string[]): Promise<void>;
  getPublicKey(uid: string): Promise<string | null>;
  setPublicKey(uid: string, publicKey: string): Promise<void>;
}

export const relayDocId = (from: string, to: string, msgId: string, part: number) => `${from}_${to}_${msgId}_${part}`;

export function splitSealed(data: string, size: number = RELAY_PART_SIZE): string[] {
  const parts: string[] = [];
  for (let i = 0; i < data.length; i += size) parts.push(data.slice(i, i + size));
  return parts.length > 0 ? parts : [''];
}

function toPart(id: string, data: Record<string, unknown>): RelayPart | null {
  const { from, to, msgId, part, parts, nonce } = data;
  if (
    typeof from !== 'string' ||
    typeof to !== 'string' ||
    typeof msgId !== 'string' ||
    typeof part !== 'number' ||
    typeof parts !== 'number' ||
    typeof nonce !== 'string' ||
    typeof data.data !== 'string'
  ) {
    return null;
  }
  return { id, from, to, msgId, part, parts, nonce, data: data.data };
}

/** Reúne las partes de cada mensaje; devuelve solo los mensajes completos. */
export function assembleParts(parts: RelayPart[]): RelayedMessage[] {
  const groups = new Map<string, RelayPart[]>();
  for (const p of parts) {
    const key = `${p.from}:${p.msgId}`;
    groups.set(key, [...(groups.get(key) ?? []), p]);
  }
  const complete: RelayedMessage[] = [];
  groups.forEach((group) => {
    const { from, msgId, parts: total, nonce } = group[0];
    const ordered = Array.from<RelayPart | undefined>({ length: total });
    for (const p of group) {
      if (p.parts === total && p.nonce === nonce && p.part >= 0 && p.part < total) ordered[p.part] = p;
    }
    if (ordered.some((p) => !p)) return;
    complete.push({
      from,
      msgId,
      sealed: { nonce, data: ordered.map((p) => p!.data).join('') },
      ids: group.map((p) => p.id),
    });
  });
  return complete;
}

export function createFirestoreRelay(db: Firestore): Relay {
  return {
    async publish(from, to, msgId, sealed) {
      const chunks = splitSealed(sealed.data);
      if (chunks.length > MAX_RELAY_PARTS) throw new Error('El mensaje es demasiado grande para dejarlo en espera.');
      const batch = writeBatch(db);
      const createdAt = Date.now();
      chunks.forEach((data, part) => {
        batch.set(doc(db, 'relay', relayDocId(from, to, msgId, part)), {
          from,
          to,
          msgId,
          part,
          parts: chunks.length,
          nonce: sealed.nonce,
          data,
          createdAt,
        });
      });
      await batch.commit();
    },
    subscribeIncoming(uid, callback, onError) {
      return onSnapshot(
        query(collection(db, 'relay'), where('to', '==', uid)),
        (snap) => {
          const parts = snap.docs.map((d) => toPart(d.id, d.data())).filter((p): p is RelayPart => p !== null);
          callback(assembleParts(parts));
        },
        onError,
      );
    },
    subscribeOutgoing(uid, callback, onError) {
      return onSnapshot(
        query(collection(db, 'relay'), where('from', '==', uid)),
        { includeMetadataChanges: true },
        (snap) => {
          if (snap.metadata.fromCache) return;
          const waiting = new Map<string, Set<string>>();
          snap.docs.forEach((d) => {
            const { to, msgId } = d.data();
            if (typeof to !== 'string' || typeof msgId !== 'string') return;
            waiting.set(to, (waiting.get(to) ?? new Set()).add(msgId));
          });
          callback(waiting);
        },
        onError,
      );
    },
    async remove(ids) {
      const batch = writeBatch(db);
      ids.forEach((id) => batch.delete(doc(db, 'relay', id)));
      await batch.commit();
    },
    async getPublicKey(uid) {
      const snap = await getDoc(doc(db, 'profiles', uid));
      const key = snap.exists() ? snap.data().publicKey : null;
      return isPublicKey(key) ? key : null;
    },
    async setPublicKey(uid, publicKey) {
      await updateDoc(doc(db, 'profiles', uid), { publicKey });
    },
  };
}

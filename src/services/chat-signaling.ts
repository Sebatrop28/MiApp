import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  type Firestore,
  type Unsubscribe,
} from 'firebase/firestore';

import { friendRequestId } from '@/utils/username';

import type { SessionDescription, Signaling, IncomingCall } from './p2p';

/**
 * Señalización WebRTC en Firestore: solo el SDP (cómo conectar los dos teléfonos),
 * nunca el contenido de los mensajes. El documento se borra al conectar.
 *
 * calls/{from_to}  { from, to, offer: { type, sdp }, answer?: { type, sdp }, createdAt }
 */
const toDescription = (value: unknown): SessionDescription | null => {
  const v = value as { type?: unknown; sdp?: unknown } | null | undefined;
  return v && typeof v.type === 'string' && typeof v.sdp === 'string'
    ? { type: v.type as SessionDescription['type'], sdp: v.sdp }
    : null;
};

export function createFirestoreSignaling(db: Firestore): Signaling {
  return {
    async publishOffer(from, to, offer) {
      await setDoc(doc(db, 'calls', friendRequestId(from, to)), {
        from,
        to,
        offer: { type: offer.type, sdp: offer.sdp },
        createdAt: Date.now(),
      });
      return friendRequestId(from, to);
    },
    async publishAnswer(callId, answer) {
      await updateDoc(doc(db, 'calls', callId), { answer: { type: answer.type, sdp: answer.sdp } });
    },
    watchAnswer(callId, callback): Unsubscribe {
      return onSnapshot(
        doc(db, 'calls', callId),
        (snap) => {
          const answer = snap.exists() ? toDescription(snap.data().answer) : null;
          if (answer) callback(answer);
        },
        () => {},
      );
    },
    subscribeToIncoming(uid, callback, onError): Unsubscribe {
      return onSnapshot(
        query(collection(db, 'calls'), where('to', '==', uid)),
        (snap) => {
          const calls: IncomingCall[] = [];
          snap.docs.forEach((d) => {
            const data = d.data();
            const offer = toDescription(data.offer);
            if (offer && !data.answer) {
              calls.push({ id: d.id, from: String(data.from), offer, createdAt: Number(data.createdAt ?? 0) });
            }
          });
          callback(calls);
        },
        (e) => onError(e),
      );
    },
    async deleteCall(callId) {
      await deleteDoc(doc(db, 'calls', callId)).catch(() => {});
    },
  };
}

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  setDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { isFirebaseConfigured } from '@/config/firebase-config';
import { DISPLAY_NAME_MAX_LENGTH, friendRequestId, friendshipId, normalizeUsername } from '@/utils/username';

import { getFirebaseDb } from './firebase';

/**
 * Amigos en Firestore. Solo se guardan perfiles públicos (usuario y nombre),
 * solicitudes y amistades; los mensajes del chat nunca pasan por aquí.
 *
 * profiles/{uid}            { uid, username, displayName, createdAt }
 * usernames/{username}      { uid }                      ← reserva el nombre (único)
 * friendRequests/{from_to}  { from, to, fromProfile, toProfile, createdAt }
 * friendships/{a_b}         { members: [a, b], profiles: { [uid]: perfil }, createdAt }
 */
export interface UserProfile {
  uid: string;
  username: string;
  displayName: string;
}

export interface FriendRequest {
  id: string;
  from: UserProfile;
  to: UserProfile;
  createdAt: number;
}

export interface Friend {
  friendshipId: string;
  profile: UserProfile;
  since: number;
}

export class FriendsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FriendsError';
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  'permission-denied':
    'Firestore rechazó la operación. Revisa que la base de datos exista y que publicaste las reglas de «firestore.rules» (ver README).',
  unavailable: 'Sin conexión. Revisa tu internet e inténtalo de nuevo.',
  'not-found': 'La base de datos Firestore no existe todavía. Créala en la consola de Firebase (ver README).',
  'failed-precondition': 'La base de datos Firestore no está lista. Revisa la consola de Firebase.',
};

export function toFriendsErrorMessage(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (typeof code === 'string' && ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (error instanceof Error && error.message) return error.message;
  return 'No se pudo completar la operación. Inténtalo de nuevo.';
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  if (!isFirebaseConfigured) throw new FriendsError('Firebase no está configurado (ver README).');
  try {
    return await operation();
  } catch (e) {
    throw e instanceof FriendsError ? e : new FriendsError(toFriendsErrorMessage(e));
  }
}

type ErrorCallback = (message: string) => void;

const toProfile = (data: Record<string, unknown>): UserProfile => ({
  uid: String(data.uid ?? ''),
  username: String(data.username ?? ''),
  displayName: String(data.displayName ?? ''),
});

const toRequest = (id: string, data: Record<string, unknown>): FriendRequest => ({
  id,
  from: toProfile(data.fromProfile as Record<string, unknown>),
  to: toProfile(data.toProfile as Record<string, unknown>),
  createdAt: Number(data.createdAt ?? 0),
});

const byNewest = <T extends { createdAt: number }>(a: T, b: T) => b.createdAt - a.createdAt;

export function subscribeToProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError: ErrorCallback,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), 'profiles', uid),
    (snap) => callback(snap.exists() ? toProfile(snap.data()) : null),
    (e) => onError(toFriendsErrorMessage(e)),
  );
}

export function subscribeToRequests(
  uid: string,
  direction: 'incoming' | 'outgoing',
  callback: (requests: FriendRequest[]) => void,
  onError: ErrorCallback,
): Unsubscribe {
  const field = direction === 'incoming' ? 'to' : 'from';
  return onSnapshot(
    query(collection(getFirebaseDb(), 'friendRequests'), where(field, '==', uid)),
    (snap) => callback(snap.docs.map((d) => toRequest(d.id, d.data())).sort(byNewest)),
    (e) => onError(toFriendsErrorMessage(e)),
  );
}

export function subscribeToFriends(
  uid: string,
  callback: (friends: Friend[]) => void,
  onError: ErrorCallback,
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'friendships'), where('members', 'array-contains', uid)),
    (snap) =>
      callback(
        snap.docs
          .map((d) => {
            const data = d.data();
            const members = data.members as string[];
            const other = members.find((m) => m !== uid) ?? '';
            const profiles = (data.profiles ?? {}) as Record<string, Record<string, unknown>>;
            return { friendshipId: d.id, profile: toProfile(profiles[other] ?? { uid: other }), since: Number(data.createdAt ?? 0) };
          })
          .sort((a, b) => a.profile.username.localeCompare(b.profile.username)),
      ),
    (e) => onError(toFriendsErrorMessage(e)),
  );
}

/** Reserva el nombre de usuario y crea el perfil en una sola transacción. */
export function createProfile(uid: string, username: string, displayName: string): Promise<UserProfile> {
  return run(async () => {
    const db = getFirebaseDb();
    const name = normalizeUsername(username);
    const profile: UserProfile = {
      uid,
      username: name,
      displayName: displayName.trim().slice(0, DISPLAY_NAME_MAX_LENGTH).trim() || name,
    };
    await runTransaction(db, async (tx) => {
      const taken = await tx.get(doc(db, 'usernames', name));
      if (taken.exists()) throw new FriendsError('Ese nombre de usuario ya está en uso. Prueba con otro.');
      tx.set(doc(db, 'usernames', name), { uid });
      tx.set(doc(db, 'profiles', uid), { ...profile, createdAt: Date.now() });
    });
    return profile;
  });
}

export function findUserByUsername(username: string): Promise<UserProfile | null> {
  return run(async () => {
    const db = getFirebaseDb();
    const owner = await getDoc(doc(db, 'usernames', normalizeUsername(username)));
    if (!owner.exists()) return null;
    const profile = await getDoc(doc(db, 'profiles', String(owner.data().uid)));
    return profile.exists() ? toProfile(profile.data()) : null;
  });
}

export function sendFriendRequest(from: UserProfile, to: UserProfile): Promise<void> {
  return run(() =>
    setDoc(doc(getFirebaseDb(), 'friendRequests', friendRequestId(from.uid, to.uid)), {
      from: from.uid,
      to: to.uid,
      fromProfile: from,
      toProfile: to,
      createdAt: Date.now(),
    }),
  );
}

/** Crea la amistad y borra la solicitud a la vez; solo puede hacerlo quien la recibió. */
export function acceptFriendRequest(request: FriendRequest): Promise<void> {
  return run(async () => {
    const db = getFirebaseDb();
    const members = [request.from.uid, request.to.uid].sort();
    // Perfiles actuales: el nombre visible pudo cambiar desde que se envió la solicitud.
    const [from, to] = await Promise.all(
      [request.from, request.to].map(async (stale) => {
        const snap = await getDoc(doc(db, 'profiles', stale.uid));
        return snap.exists() ? toProfile(snap.data()) : stale;
      }),
    );
    const batch = writeBatch(db);
    batch.set(doc(db, 'friendships', friendshipId(request.from.uid, request.to.uid)), {
      members,
      profiles: { [from.uid]: from, [to.uid]: to },
      createdAt: Date.now(),
    });
    batch.delete(doc(db, 'friendRequests', request.id));
    await batch.commit();
  });
}

/** Rechazar (quien la recibe) o cancelar (quien la envió). */
export function deleteFriendRequest(request: FriendRequest): Promise<void> {
  return run(() => deleteDoc(doc(getFirebaseDb(), 'friendRequests', request.id)));
}

export function removeFriend(friend: Friend): Promise<void> {
  return run(() => deleteDoc(doc(getFirebaseDb(), 'friendships', friend.friendshipId)));
}

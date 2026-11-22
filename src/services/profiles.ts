import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { BIO_MAX_LENGTH } from '@/utils/posts';
import { DISPLAY_NAME_MAX_LENGTH, friendRequestId } from '@/utils/username';

import { getFirebaseDb } from './firebase';
import { toFriendsErrorMessage } from './friends';

/**
 * Perfiles públicos y seguidores.
 *
 * profiles/{uid}                 + bio, avatarUpdatedAt
 * avatars/{uid}                  { data }   ← foto de perfil en base64 (256 px)
 * follows/{follower_followed}    { follower, followed, createdAt }   ← seguir no necesita aceptación
 */
export interface PublicProfile {
  uid: string;
  username: string;
  displayName: string;
  bio: string;
  /** `null` si no tiene foto de perfil. */
  avatarUpdatedAt: number | null;
}

export const toProfilesErrorMessage = toFriendsErrorMessage;

function toPublicProfile(uid: string, data: Record<string, unknown>): PublicProfile {
  return {
    uid,
    username: String(data.username ?? ''),
    displayName: String(data.displayName ?? ''),
    bio: typeof data.bio === 'string' ? data.bio : '',
    avatarUpdatedAt: typeof data.avatarUpdatedAt === 'number' ? data.avatarUpdatedAt : null,
  };
}

export function subscribeToPublicProfile(
  uid: string,
  callback: (profile: PublicProfile | null) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), 'profiles', uid),
    (snap) => callback(snap.exists() ? toPublicProfile(uid, snap.data()) : null),
    (e) => onError(toProfilesErrorMessage(e)),
  );
}

export async function updateProfile(uid: string, changes: { displayName: string; bio: string }): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'profiles', uid), {
    displayName: changes.displayName.trim().slice(0, DISPLAY_NAME_MAX_LENGTH),
    bio: changes.bio.trim().slice(0, BIO_MAX_LENGTH),
  });
}

export async function setAvatar(uid: string, base64: string): Promise<void> {
  const db = getFirebaseDb();
  const version = Date.now();
  const batch = writeBatch(db);
  batch.set(doc(db, 'avatars', uid), { data: base64 });
  batch.update(doc(db, 'profiles', uid), { avatarUpdatedAt: version });
  await batch.commit();
  await saveCachedAvatar(uid, { version, data: base64 });
}

export async function removeAvatar(uid: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'avatars', uid));
  batch.update(doc(db, 'profiles', uid), { avatarUpdatedAt: null });
  await batch.commit();
  await saveCachedAvatar(uid, { version: Date.now(), data: null });
}

// --- Fotos de perfil con caché en el teléfono: se descargan una vez por sesión o cuando cambian. ---

interface CachedAvatar {
  version: number;
  data: string | null;
}

const avatarKey = (uid: string) => `@miapp/avatar/v1/${uid}`;
const memory = new Map<string, CachedAvatar>();
const checkedThisSession = new Set<string>();
const inFlight = new Map<string, Promise<string | null>>();

const avatarListeners = new Map<string, Set<() => void>>();

/** Avisa cuando cambia la foto guardada de `uid` (p. ej. tras editar el perfil). */
export function subscribeToAvatarChanges(uid: string, listener: () => void): () => void {
  const set = avatarListeners.get(uid) ?? new Set();
  set.add(listener);
  avatarListeners.set(uid, set);
  return () => {
    set.delete(listener);
  };
}

async function saveCachedAvatar(uid: string, entry: CachedAvatar) {
  const changed = memory.get(uid)?.data !== entry.data;
  memory.set(uid, entry);
  checkedThisSession.add(uid);
  if (changed) avatarListeners.get(uid)?.forEach((listener) => listener());
  await AsyncStorage.setItem(avatarKey(uid), JSON.stringify(entry)).catch(() => {});
}

async function readCachedAvatar(uid: string): Promise<CachedAvatar | null> {
  const known = memory.get(uid);
  if (known) return known;
  try {
    const stored = await AsyncStorage.getItem(avatarKey(uid));
    const parsed = stored ? (JSON.parse(stored) as CachedAvatar) : null;
    if (parsed && typeof parsed.version === 'number') {
      memory.set(uid, parsed);
      return parsed;
    }
  } catch {
    // Caché dañada: se vuelve a descargar.
  }
  return null;
}

/**
 * Foto de perfil en base64, o `null` si no tiene. `version` es `avatarUpdatedAt` del perfil
 * si se conoce; sin ella se comprueba en Firestore una vez por sesión.
 */
export function getAvatar(uid: string, version?: number | null): Promise<string | null> {
  const pending = inFlight.get(uid);
  if (pending) return pending;
  const promise = (async () => {
    const cached = await readCachedAvatar(uid);
    if (version === null) return null;
    const fresh = version !== undefined ? cached !== null && cached.version >= version : checkedThisSession.has(uid);
    if (cached && fresh) return cached.data;
    const snap = await getDoc(doc(getFirebaseDb(), 'avatars', uid));
    const data = snap.exists() && typeof snap.data().data === 'string' ? (snap.data().data as string) : null;
    await saveCachedAvatar(uid, { version: version ?? Date.now(), data });
    return data;
  })().finally(() => inFlight.delete(uid));
  inFlight.set(uid, promise);
  return promise;
}

// --- Seguidores ---

export function subscribeToFollowing(uid: string, callback: (uids: string[]) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'follows'), where('follower', '==', uid)),
    (snap) => callback(snap.docs.map((d) => String(d.data().followed))),
    (e) => onError(toProfilesErrorMessage(e)),
  );
}

export async function follow(me: string, them: string): Promise<void> {
  await setDoc(doc(getFirebaseDb(), 'follows', friendRequestId(me, them)), { follower: me, followed: them, createdAt: Date.now() });
}

export async function unfollow(me: string, them: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'follows', friendRequestId(me, them)));
}

export async function getFollowCounts(uid: string): Promise<{ followers: number; following: number }> {
  const follows = collection(getFirebaseDb(), 'follows');
  const [followers, following] = await Promise.all([
    getCountFromServer(query(follows, where('followed', '==', uid))),
    getCountFromServer(query(follows, where('follower', '==', uid))),
  ]);
  return { followers: followers.data().count, following: following.data().count };
}

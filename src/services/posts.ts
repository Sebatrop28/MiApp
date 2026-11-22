import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { normalizeLink } from '@/utils/posts';

import { getFirebaseDb } from './firebase';
import { toFriendsErrorMessage, type UserProfile } from './friends';

/**
 * Publicaciones visibles para todas las cuentas. A diferencia del chat, se guardan en Firestore.
 *
 * posts/{id}       { authorUid, author: perfil, text, link, image: { width, height } | null, likes: uid[], createdAt }
 * postImages/{id}  { data }   ← foto en base64, aparte para que el muro cargue rápido
 */
export interface Post {
  id: string;
  author: UserProfile;
  text: string;
  link: string | null;
  image: { width: number; height: number } | null;
  likes: string[];
  createdAt: number;
}

export interface NewPost {
  text: string;
  link: string;
  image: { base64: string; width: number; height: number } | null;
}

/** Cuántas publicaciones recientes muestra el muro. */
export const FEED_LIMIT = 50;

export const toPostsErrorMessage = toFriendsErrorMessage;

function toPost(id: string, data: Record<string, unknown>): Post {
  const author = (data.author ?? {}) as Record<string, unknown>;
  const image = data.image as { width?: unknown; height?: unknown } | null | undefined;
  return {
    id,
    author: { uid: String(author.uid ?? ''), username: String(author.username ?? ''), displayName: String(author.displayName ?? '') },
    text: typeof data.text === 'string' ? data.text : '',
    link: typeof data.link === 'string' ? data.link : null,
    image: image && typeof image.width === 'number' && typeof image.height === 'number' ? { width: image.width, height: image.height } : null,
    likes: Array.isArray(data.likes) ? data.likes.filter((uid): uid is string => typeof uid === 'string') : [],
    createdAt: Number(data.createdAt ?? 0),
  };
}

export function subscribeToFeed(callback: (posts: Post[]) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'posts'), orderBy('createdAt', 'desc'), limit(FEED_LIMIT)),
    (snap) => callback(snap.docs.map((d) => toPost(d.id, d.data()))),
    (e) => onError(toPostsErrorMessage(e)),
  );
}

export async function createPost(author: UserProfile, post: NewPost): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, 'posts'));
  const batch = writeBatch(db);
  batch.set(ref, {
    authorUid: author.uid,
    author: { uid: author.uid, username: author.username, displayName: author.displayName },
    text: post.text.trim(),
    link: normalizeLink(post.link),
    image: post.image ? { width: post.image.width, height: post.image.height } : null,
    likes: [],
    createdAt: Date.now(),
  });
  if (post.image) batch.set(doc(db, 'postImages', ref.id), { data: post.image.base64 });
  await batch.commit();
}

export async function getPostImage(postId: string): Promise<string | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'postImages', postId));
  const data = snap.exists() ? snap.data().data : null;
  return typeof data === 'string' ? data : null;
}

export async function setLiked(postId: string, uid: string, liked: boolean): Promise<void> {
  await updateDoc(doc(getFirebaseDb(), 'posts', postId), { likes: liked ? arrayUnion(uid) : arrayRemove(uid) });
}

export async function deletePost(post: Post): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  if (post.image) batch.delete(doc(db, 'postImages', post.id));
  batch.delete(doc(db, 'posts', post.id));
  await batch.commit();
}

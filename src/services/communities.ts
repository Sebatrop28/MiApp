import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
  type Unsubscribe,
} from 'firebase/firestore';

import { communitySearchKey, normalizeCommunityName } from '@/utils/communities';

import { getFirebaseDb } from './firebase';
import type { UserProfile } from './friends';
import { toFeedError } from './posts';

/**
 * Comunidades públicas: cualquiera las encuentra y se une; solo los miembros publican, y solo texto.
 *
 * communities/{id}                 { name, nameLower, description, ownerUid, owner: perfil, memberCount, createdAt }
 * communities/{id}/posts/{postId}  { authorUid, author: perfil, text, createdAt }
 * communityMembers/{id_uid}        { uid, communityId, name, joinedAt }
 */
export interface Community {
  id: string;
  name: string;
  description: string;
  ownerUid: string;
  owner: UserProfile;
  memberCount: number;
  createdAt: number;
}

export interface Membership {
  communityId: string;
  name: string;
  joinedAt: number;
}

export interface CommunityPost {
  id: string;
  author: UserProfile;
  text: string;
  createdAt: number;
}

export const toCommunitiesErrorMessage = toFeedError;

const memberId = (communityId: string, uid: string) => `${communityId}_${uid}`;

function toProfile(value: unknown): UserProfile {
  const p = (value ?? {}) as Record<string, unknown>;
  return { uid: String(p.uid ?? ''), username: String(p.username ?? ''), displayName: String(p.displayName ?? '') };
}

function toCommunity(id: string, data: Record<string, unknown>): Community {
  return {
    id,
    name: String(data.name ?? ''),
    description: typeof data.description === 'string' ? data.description : '',
    ownerUid: String(data.ownerUid ?? ''),
    owner: toProfile(data.owner),
    memberCount: Number(data.memberCount ?? 0),
    createdAt: Number(data.createdAt ?? 0),
  };
}

function toCommunityPost(id: string, data: Record<string, unknown>): CommunityPost {
  return { id, author: toProfile(data.author), text: String(data.text ?? ''), createdAt: Number(data.createdAt ?? 0) };
}

/** Las comunidades con más miembros. */
export function subscribeToPopularCommunities(callback: (communities: Community[]) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'communities'), orderBy('memberCount', 'desc'), limit(30)),
    (snap) => callback(snap.docs.map((d) => toCommunity(d.id, d.data()))),
    (e) => onError(toCommunitiesErrorMessage(e)),
  );
}

/** Busca por el comienzo del nombre, sin distinguir mayúsculas. */
export async function searchCommunities(text: string): Promise<Community[]> {
  const key = communitySearchKey(text);
  if (!key) return [];
  const snap = await getDocs(
    query(
      collection(getFirebaseDb(), 'communities'),
      where('nameLower', '>=', key),
      where('nameLower', '<=', `${key}\u{10ffff}`),
      orderBy('nameLower'),
      limit(20),
    ),
  );
  return snap.docs.map((d) => toCommunity(d.id, d.data()));
}

export function subscribeToMyCommunities(uid: string, callback: (memberships: Membership[]) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'communityMembers'), where('uid', '==', uid)),
    (snap) =>
      callback(
        snap.docs
          .map((d) => ({ communityId: String(d.data().communityId ?? ''), name: String(d.data().name ?? ''), joinedAt: Number(d.data().joinedAt ?? 0) }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      ),
    (e) => onError(toCommunitiesErrorMessage(e)),
  );
}

export function subscribeToCommunity(id: string, callback: (community: Community | null) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), 'communities', id),
    (snap) => callback(snap.exists() ? toCommunity(snap.id, snap.data()) : null),
    (e) => onError(toCommunitiesErrorMessage(e)),
  );
}

export function subscribeToMembership(communityId: string, uid: string, callback: (member: boolean) => void, onError: (message: string) => void): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseDb(), 'communityMembers', memberId(communityId, uid)),
    (snap) => callback(snap.exists()),
    (e) => onError(toCommunitiesErrorMessage(e)),
  );
}

/** Crea la comunidad con quien la crea como primer miembro. Devuelve su id. */
export async function createCommunity(owner: UserProfile, input: { name: string; description: string }): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, 'communities'));
  const name = normalizeCommunityName(input.name);
  const now = Date.now();
  const batch = writeBatch(db);
  batch.set(ref, {
    name,
    nameLower: communitySearchKey(name),
    description: input.description.trim(),
    ownerUid: owner.uid,
    owner: { uid: owner.uid, username: owner.username, displayName: owner.displayName },
    memberCount: 1,
    createdAt: now,
  });
  batch.set(doc(db, 'communityMembers', memberId(ref.id, owner.uid)), { uid: owner.uid, communityId: ref.id, name, joinedAt: now });
  await batch.commit();
  return ref.id;
}

export async function joinCommunity(community: Pick<Community, 'id' | 'name'>, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(doc(db, 'communityMembers', memberId(community.id, uid)), { uid, communityId: community.id, name: community.name, joinedAt: Date.now() });
  batch.update(doc(db, 'communities', community.id), { memberCount: increment(1) });
  await batch.commit();
}

export async function leaveCommunity(communityId: string, uid: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.delete(doc(db, 'communityMembers', memberId(communityId, uid)));
  batch.update(doc(db, 'communities', communityId), { memberCount: increment(-1) });
  await batch.commit();
}

export const COMMUNITY_POSTS_PAGE = 50;

export function subscribeToCommunityPosts(
  communityId: string,
  max: number,
  callback: (posts: CommunityPost[]) => void,
  onError: (message: string) => void,
): Unsubscribe {
  return onSnapshot(
    query(collection(getFirebaseDb(), 'communities', communityId, 'posts'), orderBy('createdAt', 'desc'), limit(max)),
    (snap) => callback(snap.docs.map((d) => toCommunityPost(d.id, d.data()))),
    (e) => onError(toCommunitiesErrorMessage(e)),
  );
}

export async function createCommunityPost(communityId: string, author: UserProfile, text: string): Promise<void> {
  const db = getFirebaseDb();
  const batch = writeBatch(db);
  batch.set(doc(collection(db, 'communities', communityId, 'posts')), {
    authorUid: author.uid,
    author: { uid: author.uid, username: author.username, displayName: author.displayName },
    text: text.trim(),
    createdAt: Date.now(),
  });
  await batch.commit();
}

export async function deleteCommunityPost(communityId: string, postId: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'communities', communityId, 'posts', postId));
}

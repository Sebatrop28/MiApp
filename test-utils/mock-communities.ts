import type { Community, CommunityPost, Membership } from '@/services/communities';
import type { UserProfile } from '@/services/friends';

/** Sustituto en memoria de `@/services/communities` para las pruebas (sin Firestore). */
type Listener = () => void;

const communities = new Map<string, Community>();
const members = new Map<string, Membership & { uid: string }>();
const posts = new Map<string, (CommunityPost & { communityId: string })[]>();
const listeners = new Set<Listener>();
let counter = 0;

const emit = () => listeners.forEach((listener) => listener());
const listen = (listener: Listener) => {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
};

export const toCommunitiesErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Error');

export function reset() {
  communities.clear();
  members.clear();
  posts.clear();
  listeners.clear();
  counter = 0;
}

export function addCommunity(community: Community) {
  communities.set(community.id, community);
  emit();
}

export const subscribeToPopularCommunities = (callback: (c: Community[]) => void) =>
  listen(() => callback([...communities.values()].sort((a, b) => b.memberCount - a.memberCount)));

export const searchCommunities = jest.fn(async (text: string) =>
  [...communities.values()].filter((c) => c.name.toLowerCase().startsWith(text.trim().toLowerCase())),
);

export const subscribeToMyCommunities = (uid: string, callback: (m: Membership[]) => void) =>
  listen(() => callback([...members.values()].filter((m) => m.uid === uid)));

export const subscribeToCommunity = (id: string, callback: (c: Community | null) => void) => listen(() => callback(communities.get(id) ?? null));

export const subscribeToMembership = (id: string, uid: string, callback: (member: boolean) => void) =>
  listen(() => callback(members.has(`${id}_${uid}`)));

export const COMMUNITY_POSTS_PAGE = 50;

export const subscribeToCommunityPosts = (id: string, max: number, callback: (p: CommunityPost[]) => void) =>
  listen(() => callback([...(posts.get(id) ?? [])].sort((a, b) => b.createdAt - a.createdAt).slice(0, max)));

export const createCommunity = jest.fn(async (owner: UserProfile, input: { name: string; description: string }) => {
  counter += 1;
  const id = `c${counter}`;
  communities.set(id, { id, name: input.name.trim(), description: input.description.trim(), ownerUid: owner.uid, owner, memberCount: 1, createdAt: Date.now() });
  members.set(`${id}_${owner.uid}`, { uid: owner.uid, communityId: id, name: input.name.trim(), joinedAt: Date.now() });
  emit();
  return id;
});

export const joinCommunity = jest.fn(async (community: Pick<Community, 'id' | 'name'>, uid: string) => {
  members.set(`${community.id}_${uid}`, { uid, communityId: community.id, name: community.name, joinedAt: Date.now() });
  const c = communities.get(community.id);
  if (c) communities.set(c.id, { ...c, memberCount: c.memberCount + 1 });
  emit();
});

export const leaveCommunity = jest.fn(async (id: string, uid: string) => {
  members.delete(`${id}_${uid}`);
  const c = communities.get(id);
  if (c) communities.set(id, { ...c, memberCount: c.memberCount - 1 });
  emit();
});

export const createCommunityPost = jest.fn(async (id: string, author: UserProfile, text: string) => {
  counter += 1;
  posts.set(id, [...(posts.get(id) ?? []), { id: `cp${counter}`, communityId: id, author, text: text.trim(), createdAt: Date.now() + counter }]);
  emit();
});

export const deleteCommunityPost = jest.fn(async (id: string, postId: string) => {
  posts.set(id, (posts.get(id) ?? []).filter((p) => p.id !== postId));
  emit();
});

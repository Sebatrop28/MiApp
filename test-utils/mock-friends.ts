import type { Friend, FriendRequest, UserProfile } from '@/services/friends';
import { friendRequestId, friendshipId, normalizeUsername } from '@/utils/username';

/** Sustituto en memoria de `@/services/friends` para las pruebas (sin Firestore). */
type Listener = () => void;

const profiles = new Map<string, UserProfile>();
const requests = new Map<string, FriendRequest>();
const friendships = new Map<string, { members: string[]; since: number }>();
const listeners = new Set<Listener>();

const emit = () => listeners.forEach((listener) => listener());

function listen(listener: Listener) {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

export class FriendsError extends Error {}

export function toFriendsErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Error';
}

export function reset() {
  profiles.clear();
  requests.clear();
  friendships.clear();
  listeners.clear();
  [createProfile, findUserByUsername, sendFriendRequest, acceptFriendRequest, deleteFriendRequest, removeFriend].forEach(
    (mock) => mock.mockClear(),
  );
}

export function addProfile(profile: UserProfile) {
  profiles.set(profile.uid, profile);
  emit();
}

export function addRequest(from: UserProfile, to: UserProfile) {
  requests.set(friendRequestId(from.uid, to.uid), { id: friendRequestId(from.uid, to.uid), from, to, createdAt: Date.now() });
  emit();
}

export function friendUids(uid: string): string[] {
  return [...friendships.values()].filter((f) => f.members.includes(uid)).map((f) => f.members.find((m) => m !== uid)!);
}

export function subscribeToProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  return listen(() => callback(profiles.get(uid) ?? null));
}

export function subscribeToRequests(uid: string, direction: 'incoming' | 'outgoing', callback: (r: FriendRequest[]) => void) {
  return listen(() =>
    callback([...requests.values()].filter((r) => (direction === 'incoming' ? r.to.uid : r.from.uid) === uid)),
  );
}

export function subscribeToFriends(uid: string, callback: (friends: Friend[]) => void) {
  return listen(() =>
    callback(
      [...friendships.entries()]
        .filter(([, f]) => f.members.includes(uid))
        .map(([id, f]) => ({ friendshipId: id, profile: profiles.get(f.members.find((m) => m !== uid)!)!, since: f.since })),
    ),
  );
}

export const createProfile = jest.fn(async (uid: string, username: string, displayName: string) => {
  const name = normalizeUsername(username);
  if ([...profiles.values()].some((p) => p.username === name)) {
    throw new FriendsError('Ese nombre de usuario ya está en uso. Prueba con otro.');
  }
  const profile = { uid, username: name, displayName: displayName || name };
  addProfile(profile);
  return profile;
});

export const findUserByUsername = jest.fn(
  async (username: string) => [...profiles.values()].find((p) => p.username === normalizeUsername(username)) ?? null,
);

export const sendFriendRequest = jest.fn(async (from: UserProfile, to: UserProfile) => addRequest(from, to));

export const acceptFriendRequest = jest.fn(async (request: FriendRequest) => {
  friendships.set(friendshipId(request.from.uid, request.to.uid), {
    members: [request.from.uid, request.to.uid],
    since: Date.now(),
  });
  requests.delete(request.id);
  emit();
});

export const deleteFriendRequest = jest.fn(async (request: FriendRequest) => {
  requests.delete(request.id);
  emit();
});

export const removeFriend = jest.fn(async (friend: Friend) => {
  friendships.delete(friend.friendshipId);
  emit();
});

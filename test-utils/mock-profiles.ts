import type { PublicProfile } from '@/services/profiles';

/** Sustituto en memoria de `@/services/profiles` para las pruebas (sin Firestore). */
type Listener = () => void;

const profiles = new Map<string, PublicProfile>();
const follows = new Set<string>();
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((listener) => listener());

function listen(listener: Listener) {
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

export const toProfilesErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Error');

export function reset() {
  profiles.clear();
  follows.clear();
  listeners.clear();
  [follow, unfollow, updateProfile, setAvatar, removeAvatar].forEach((mock) => mock.mockClear());
}

export function addProfile(profile: Omit<PublicProfile, 'bio' | 'avatarUpdatedAt'> & Partial<PublicProfile>) {
  profiles.set(profile.uid, { bio: '', avatarUpdatedAt: null, ...profile });
  emit();
}

export function subscribeToPublicProfile(uid: string, callback: (profile: PublicProfile | null) => void) {
  return listen(() => callback(profiles.get(uid) ?? null));
}

export function subscribeToFollowing(uid: string, callback: (uids: string[]) => void) {
  return listen(() =>
    callback([...follows].filter((f) => f.startsWith(`${uid}_`)).map((f) => f.slice(uid.length + 1))),
  );
}

export const follow = jest.fn(async (me: string, them: string) => {
  follows.add(`${me}_${them}`);
  emit();
});

export const unfollow = jest.fn(async (me: string, them: string) => {
  follows.delete(`${me}_${them}`);
  emit();
});

export async function getFollowCounts(uid: string) {
  const all = [...follows].map((f) => f.split('_'));
  return { followers: all.filter(([, b]) => b === uid).length, following: all.filter(([a]) => a === uid).length };
}

export const updateProfile = jest.fn(async (uid: string, changes: { displayName: string; bio: string }) => {
  const current = profiles.get(uid);
  if (current) profiles.set(uid, { ...current, displayName: changes.displayName.trim(), bio: changes.bio.trim() });
  emit();
});

export const setAvatar = jest.fn(async () => {});
export const removeAvatar = jest.fn(async () => {});
export const getAvatar = jest.fn(async () => null);

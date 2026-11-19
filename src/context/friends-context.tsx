import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import * as friends from '@/services/friends';
import type { Friend, FriendRequest, UserProfile } from '@/services/friends';
import { normalizeUsername } from '@/utils/username';

export type FriendsStatus = 'loading' | 'ready';

export interface FriendsContextValue {
  status: FriendsStatus;
  /** Error de conexión con Firestore (las listas pueden estar desactualizadas). */
  error: string | null;
  /** `null` hasta que la cuenta elige su nombre de usuario. */
  profile: UserProfile | null;
  friends: Friend[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
  createProfile: (username: string) => Promise<UserProfile>;
  findUser: (username: string) => Promise<UserProfile | null>;
  /** Si esa persona ya te había enviado una solicitud, se acepta directamente. */
  sendRequest: (to: UserProfile) => Promise<'sent' | 'accepted'>;
  acceptRequest: (request: FriendRequest) => Promise<void>;
  deleteRequest: (request: FriendRequest) => Promise<void>;
  removeFriend: (friend: Friend) => Promise<void>;
  retry: () => void;
}

const FriendsContext = createContext<FriendsContextValue | null>(null);

export interface FriendsProviderProps extends PropsWithChildren {
  userId: string;
  displayName: string | null;
}

/** Mantiene sincronizados el perfil, las solicitudes y los amigos de la cuenta actual. */
export function FriendsProvider({ userId, displayName, children }: FriendsProviderProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [friendList, setFriendList] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const onError = (message: string) => {
      setError(message);
      setProfileLoaded(true);
    };
    return friends.subscribeToProfile(
      userId,
      (next) => {
        setProfile(next);
        setProfileLoaded(true);
      },
      onError,
    );
  }, [userId, attempt]);

  const hasProfile = profile !== null;

  useEffect(() => {
    if (!hasProfile) return;
    const unsubscribers = [
      friends.subscribeToFriends(userId, setFriendList, setError),
      friends.subscribeToRequests(userId, 'incoming', setIncoming, setError),
      friends.subscribeToRequests(userId, 'outgoing', setOutgoing, setError),
    ];
    return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
  }, [userId, hasProfile, attempt]);

  const retry = useCallback(() => {
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  const createProfile = useCallback(
    async (username: string) => {
      const created = await friends.createProfile(userId, username, displayName ?? '');
      setProfile(created);
      return created;
    },
    [userId, displayName],
  );

  const findUser = useCallback((username: string) => friends.findUserByUsername(normalizeUsername(username)), []);

  const sendRequest = useCallback<FriendsContextValue['sendRequest']>(
    async (to) => {
      if (!profile) throw new friends.FriendsError('Primero elige tu nombre de usuario.');
      if (to.uid === profile.uid) throw new friends.FriendsError('No puedes añadirte a ti mismo.');
      if (friendList.some((f) => f.profile.uid === to.uid)) {
        throw new friends.FriendsError(`@${to.username} ya es tu amigo.`);
      }
      if (outgoing.some((r) => r.to.uid === to.uid)) {
        throw new friends.FriendsError(`Ya le enviaste una solicitud a @${to.username}.`);
      }
      const pending = incoming.find((r) => r.from.uid === to.uid);
      if (pending) {
        await friends.acceptFriendRequest(pending);
        return 'accepted';
      }
      await friends.sendFriendRequest(profile, to);
      return 'sent';
    },
    [profile, friendList, incoming, outgoing],
  );

  const value = useMemo<FriendsContextValue>(
    () => ({
      status: profileLoaded ? 'ready' : 'loading',
      error,
      profile,
      friends: friendList,
      incoming,
      outgoing,
      createProfile,
      findUser,
      sendRequest,
      acceptRequest: friends.acceptFriendRequest,
      deleteRequest: friends.deleteFriendRequest,
      removeFriend: friends.removeFriend,
      retry,
    }),
    [profileLoaded, error, profile, friendList, incoming, outgoing, createProfile, findUser, sendRequest, retry],
  );

  return <FriendsContext value={value}>{children}</FriendsContext>;
}

export function useFriends(): FriendsContextValue {
  const context = use(FriendsContext);
  if (!context) throw new Error('useFriends debe usarse dentro de <FriendsProvider>.');
  return context;
}

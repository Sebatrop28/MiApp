import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { PostCard } from '@/components/posts/post-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFriends } from '@/context/friends-context';
import { useFeed } from '@/hooks/use-feed';
import { useFollowing } from '@/hooks/use-following';
import {
  follow,
  getFollowCounts,
  subscribeToPublicProfile,
  toProfilesErrorMessage,
  unfollow,
  type PublicProfile,
} from '@/services/profiles';

/** Perfil público: foto, descripción, seguidores y publicaciones de las últimas 24 h. */
export default function ProfileScreen() {
  const { uid } = useLocalSearchParams<{ uid: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const { profile: myProfile } = useFriends();
  const [state, setState] = useState<{ uid: string; profile: PublicProfile | null; error: string | null } | null>(null);
  const [counts, setCounts] = useState<{ key: string; followers: number; following: number } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { following } = useFollowing(myProfile ? user?.uid : undefined);
  const authors = useMemo(() => [uid], [uid]);
  const feed = useFeed(authors);

  const isMe = user?.uid === uid;
  const isFollowing = following?.includes(uid) ?? false;
  const countsKey = `${uid}:${isFollowing}`;

  useEffect(
    () =>
      subscribeToPublicProfile(
        uid,
        (profile) => setState({ uid, profile, error: null }),
        (error) => setState({ uid, profile: null, error }),
      ),
    [uid],
  );

  useEffect(() => {
    let active = true;
    getFollowCounts(uid)
      .then((c) => {
        if (active) setCounts({ key: countsKey, ...c });
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [uid, countsKey]);

  const toggleFollow = async () => {
    if (!user) return;
    setActionError(null);
    setBusy(true);
    try {
      await (isFollowing ? unfollow(user.uid, uid) : follow(user.uid, uid));
    } catch (e) {
      setActionError(toProfilesErrorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const current = state?.uid === uid ? state : null;
  const profile = current?.profile ?? null;
  const shownCounts = counts && counts.key === countsKey ? counts : null;

  if (!current) return <LoadingState message="Cargando perfil…" />;

  return (
    <Screen testID="profile-screen">
      <Stack.Screen options={{ title: profile ? `@${profile.username}` : 'Perfil' }} />
      {current.error ? <Banner tone="error" message={current.error} /> : null}
      {!profile && !current.error ? <ThemedText color="textSecondary">Este perfil no existe.</ThemedText> : null}
      {profile ? (
        <>
          <View style={styles.header}>
            <Avatar uid={profile.uid} name={profile.displayName} size={88} version={profile.avatarUpdatedAt} />
            <View style={styles.texts}>
              <ThemedText variant="title">{profile.displayName}</ThemedText>
              <ThemedText color="textSecondary">@{profile.username}</ThemedText>
              <ThemedText variant="caption" color="textSecondary" testID="follow-counts">
                {shownCounts ? `${shownCounts.followers} seguidores · ${shownCounts.following} seguidos` : ' '}
              </ThemedText>
            </View>
          </View>
          {profile.bio ? <ThemedText testID="profile-bio">{profile.bio}</ThemedText> : null}
          {actionError ? <Banner tone="error" message={actionError} onDismiss={() => setActionError(null)} /> : null}
          {isMe ? (
            <Button label="Editar perfil" icon="edit" variant="secondary" onPress={() => router.push('/edit-profile')} testID="button-edit-profile" />
          ) : myProfile ? (
            <Button
              label={isFollowing ? 'Dejar de seguir' : 'Seguir'}
              icon={isFollowing ? 'person_remove' : 'person_add'}
              variant={isFollowing ? 'secondary' : 'primary'}
              onPress={toggleFollow}
              loading={busy || following === null}
              testID="button-follow"
            />
          ) : null}

          <ThemedText variant="heading">Publicaciones de las últimas 24 horas</ThemedText>
          {feed.status === 'error' ? <Banner tone="error" message={feed.error} /> : null}
          {feed.status === 'ready' && feed.posts.length === 0 ? (
            <ThemedText color="textSecondary">No hay publicaciones activas.</ThemedText>
          ) : null}
          <View style={styles.list}>
            {user ? feed.posts.map((post) => <PostCard key={post.id} post={post} viewerUid={user.uid} />) : null}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  texts: { flex: 1, gap: Spacing.xxs },
  list: { gap: Spacing.md },
});

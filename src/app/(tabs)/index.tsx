import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonList } from '@/components/feedback/skeleton';
import { PostCard } from '@/components/posts/post-card';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFriends } from '@/context/friends-context';
import { useSettings } from '@/context/settings-context';
import { useFeed } from '@/hooks/use-feed';
import { useFollowing } from '@/hooks/use-following';
import { useAppTheme } from '@/hooks/use-theme';
import { cleanupExpiredPosts, splitIndexLink } from '@/services/posts';
import { getGreeting } from '@/utils/greeting';

let cleanedUp = false;

/** Inicio: publicaciones de las últimas 24 h tuyas y de la gente que sigues. */
export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { profile, status: profileStatus } = useFriends();
  const { settings } = useSettings();
  const { following, error: followingError } = useFollowing(profile ? user?.uid : undefined);
  const authors = profile && following ? [profile.uid, ...following] : null;
  const feed = useFeed(authors, settings.simulateNetworkErrors);
  const firstName = (profile?.displayName ?? user?.displayName ?? '').split(' ')[0];

  // Una vez por sesión, ayuda a borrar las publicaciones expiradas (sin TTL del plan de pago).
  useEffect(() => {
    if (!profile || cleanedUp) return;
    cleanedUp = true;
    cleanupExpiredPosts().catch(() => {});
  }, [profile]);

  return (
    <Screen
      title={firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
      subtitle="Lo de las últimas 24 horas de la gente que sigues"
      onRefresh={feed.retry}
      refreshing={false}
      headerRight={
        profile ? (
          <View style={styles.actions}>
            <HeaderButton icon="person_search" label="Buscar personas" onPress={() => router.push('/search')} testID="button-search-people" />
            <Pressable
              onPress={() => router.push(`/profile/${profile.uid}`)}
              accessibilityRole="button"
              accessibilityLabel="Mi perfil"
              testID="button-my-profile">
              <Avatar uid={profile.uid} name={profile.displayName} size={40} />
            </Pressable>
          </View>
        ) : null
      }
      testID="home-screen">
      {profile ? (
        <Card onPress={() => router.push('/new-post')} style={styles.composer} accessibilityLabel="Escribir una publicación" testID="button-new-post">
          <Icon name="add_photo_alternate" color="primary" />
          <ThemedText color="textSecondary" style={styles.flex}>
            ¿Qué quieres compartir hoy? Dura 24 horas.
          </ThemedText>
        </Card>
      ) : profileStatus === 'ready' ? (
        <View style={styles.gap}>
          <Banner message="Para publicar y seguir a personas, primero elige tu nombre de usuario en Amigos." />
          <Button label="Ir a Amigos" icon="group" variant="secondary" onPress={() => router.navigate('/friends')} />
        </View>
      ) : null}

      {followingError ? <Banner tone="error" message={followingError} /> : null}
      {profile && feed.status === 'loading' && feed.posts.length === 0 ? <SkeletonList count={3} /> : null}

      {feed.status === 'error' ? <FeedError message={feed.error} onRetry={feed.retry} /> : null}

      {feed.status === 'ready' && feed.posts.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="forum" size={40} color="textSecondary" />
          <ThemedText color="textSecondary" style={styles.center}>
            {following && following.length > 0
              ? 'La gente que sigues no ha publicado nada en las últimas 24 horas.'
              : 'Sigue a personas para ver aquí lo que publican.'}
          </ThemedText>
          <Button label="Buscar personas" icon="person_search" variant="secondary" onPress={() => router.push('/search')} />
        </View>
      ) : null}

      <View style={styles.gap}>
        {user ? feed.posts.map((post) => <PostCard key={post.id} post={post} viewerUid={user.uid} />) : null}
      </View>
    </Screen>
  );
}

function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { text, url } = splitIndexLink(message);
  return (
    <View style={styles.gap}>
      <ErrorState title="No se pudieron cargar las publicaciones" message={text} onRetry={onRetry} />
      {url ? (
        <Button label="Crear índice" icon="open_in_new" onPress={() => Linking.openURL(url).catch(() => {})} testID="button-create-index" />
      ) : null}
    </View>
  );
}

function HeaderButton({ icon, label, onPress, testID }: { icon: IconName; label: string; onPress: () => void; testID: string }) {
  const { colors } = useAppTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={[styles.headerButton, { backgroundColor: colors.primaryMuted }]}
      testID={testID}>
      <Icon name={icon} size={22} color="primary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  gap: { gap: Spacing.md },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  center: { textAlign: 'center' },
});

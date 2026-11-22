import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonList } from '@/components/feedback/skeleton';
import { PostCard } from '@/components/posts/post-card';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFriends } from '@/context/friends-context';
import { useSettings } from '@/context/settings-context';
import { useFeed } from '@/hooks/use-feed';
import { useAppTheme } from '@/hooks/use-theme';
import { getGreeting } from '@/utils/greeting';

/** Inicio: el muro de publicaciones de todas las cuentas. */
export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { profile, status: profileStatus } = useFriends();
  const { settings } = useSettings();
  const feed = useFeed(settings.simulateNetworkErrors);
  const canPost = profile !== null;
  const firstName = (profile?.displayName ?? user?.displayName ?? '').split(' ')[0];

  return (
    <Screen
      title={firstName ? `${getGreeting()}, ${firstName}` : getGreeting()}
      subtitle="Lo que comparte la gente en MiApp"
      onRefresh={feed.retry}
      refreshing={false}
      headerRight={
        canPost ? (
          <Pressable
            onPress={() => router.push('/new-post')}
            accessibilityRole="button"
            accessibilityLabel="Nueva publicación"
            hitSlop={8}
            style={[styles.newButton, { backgroundColor: colors.primary }]}
            testID="button-new-post">
            <Icon name="edit_square" size={22} color="onPrimary" />
          </Pressable>
        ) : null
      }
      testID="home-screen">
      {canPost ? (
        <Card onPress={() => router.push('/new-post')} style={styles.composer} accessibilityLabel="Escribir una publicación">
          <Icon name="add_photo_alternate" color="primary" />
          <ThemedText color="textSecondary">¿Qué quieres compartir hoy?</ThemedText>
        </Card>
      ) : profileStatus === 'ready' ? (
        <View style={styles.noProfile}>
          <Banner message="Para publicar, primero elige tu nombre de usuario en Amigos." />
          <Button label="Ir a Amigos" icon="group" variant="secondary" onPress={() => router.navigate('/friends')} />
        </View>
      ) : null}

      {feed.status === 'loading' && feed.posts.length === 0 ? <SkeletonList count={3} /> : null}

      {feed.status === 'error' ? (
        <ErrorState title="No se pudieron cargar las publicaciones" message={feed.error} onRetry={feed.retry} />
      ) : null}

      {feed.status === 'ready' && feed.posts.length === 0 ? (
        <View style={styles.empty}>
          <Icon name="forum" size={40} color="textSecondary" />
          <ThemedText color="textSecondary" style={styles.emptyText}>
            Todavía no hay publicaciones. ¡Sé la primera persona en compartir algo!
          </ThemedText>
        </View>
      ) : null}

      <View style={styles.list}>
        {user ? feed.posts.map((post) => <PostCard key={post.id} post={post} viewerUid={user.uid} />) : null}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  newButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  composer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  noProfile: { gap: Spacing.sm },
  empty: { alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xxl },
  emptyText: { textAlign: 'center' },
  list: { gap: Spacing.md },
});

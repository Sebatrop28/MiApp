import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFriends } from '@/context/friends-context';
import {
  COMMUNITY_POSTS_PAGE,
  createCommunityPost,
  deleteCommunityPost,
  joinCommunity,
  leaveCommunity,
  subscribeToCommunity,
  subscribeToCommunityPosts,
  subscribeToMembership,
  toCommunitiesErrorMessage,
  type Community,
  type CommunityPost,
} from '@/services/communities';
import { COMMUNITY_POST_MAX_LENGTH } from '@/utils/communities';
import { formatNoteDate } from '@/utils/date';

/** Una comunidad: información, unirse o salir, y publicaciones de texto de sus miembros. */
export default function CommunityScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { user } = useAuth();
  const { profile } = useFriends();
  const uid = user?.uid;
  const [community, setCommunity] = useState<{ id: string; value: Community | null } | null>(null);
  const [member, setMember] = useState<{ id: string; value: boolean } | null>(null);
  const [posts, setPosts] = useState<{ id: string; value: CommunityPost[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState<'join' | 'post' | null>(null);
  const [max, setMax] = useState(COMMUNITY_POSTS_PAGE);

  useEffect(() => subscribeToCommunity(id, (value) => setCommunity({ id, value }), setError), [id]);
  useEffect(() => subscribeToCommunityPosts(id, max, (value) => setPosts({ id, value }), setError), [id, max]);
  useEffect(() => {
    if (!uid) return;
    return subscribeToMembership(id, uid, (value) => setMember({ id, value }), setError);
  }, [id, uid]);

  const current = community?.id === id ? community.value : undefined;
  const isMember = member?.id === id ? member.value : false;
  const list = posts?.id === id ? posts.value : null;
  const isOwner = current?.ownerUid === uid;

  const run = async (kind: 'join' | 'post', action: () => Promise<void>) => {
    setError(null);
    setBusy(kind);
    try {
      await action();
    } catch (e) {
      setError(toCommunitiesErrorMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const toggleMembership = () => {
    if (!uid || !current) return;
    if (!isMember) {
      void run('join', () => joinCommunity(current, uid));
      return;
    }
    Alert.alert('Salir de la comunidad', `Dejarás de ser miembro de «${current.name}». Tus publicaciones se quedan.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: () => void run('join', () => leaveCommunity(current.id, uid)) },
    ]);
  };

  const publish = () => {
    if (!profile || !text.trim()) return;
    void run('post', async () => {
      await createCommunityPost(id, profile, text);
      setText('');
    });
  };

  const confirmDelete = (post: CommunityPost) => {
    Alert.alert('Eliminar publicación', 'Se borrará para todos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deleteCommunityPost(id, post.id).catch((e: unknown) => Alert.alert('No se pudo eliminar', toCommunitiesErrorMessage(e)));
        },
      },
    ]);
  };

  if (current === undefined) {
    return (
      <Screen testID="community-screen">
        {error ? <Banner tone="error" message={error} /> : <LoadingState message="Cargando comunidad…" />}
      </Screen>
    );
  }

  if (current === null) {
    return (
      <Screen testID="community-screen">
        <Banner message="Esta comunidad ya no existe." />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Stack.Screen options={{ title: current.name }} />
      <Screen testID="community-screen">
        {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}

        <View style={styles.gap}>
          <ThemedText variant="title">{current.name}</ThemedText>
          {current.description ? <ThemedText>{current.description}</ThemedText> : null}
          <ThemedText variant="caption" color="textSecondary">
            {current.memberCount === 1 ? '1 miembro' : `${current.memberCount} miembros`} · creada por @{current.owner.username}
          </ThemedText>
          {isOwner ? (
            <ThemedText variant="caption" color="textSecondary">
              Eres quien la creó: puedes borrar cualquier publicación.
            </ThemedText>
          ) : (
            <Button
              label={isMember ? 'Salir de la comunidad' : 'Unirme'}
              icon={isMember ? 'logout' : 'group_add'}
              variant={isMember ? 'secondary' : 'primary'}
              onPress={toggleMembership}
              loading={busy === 'join'}
              disabled={!profile}
              testID="button-toggle-membership"
            />
          )}
        </View>

        {!profile ? <Banner message="Para unirte, primero elige tu nombre de usuario en Amigos." /> : null}

        {isMember && profile ? (
          <View style={styles.gap}>
            <TextField
              label="Escribe algo para la comunidad"
              placeholder="Solo texto"
              value={text}
              onChangeText={setText}
              multiline
              numberOfLines={3}
              maxLength={COMMUNITY_POST_MAX_LENGTH}
              textAlignVertical="top"
              testID="input-community-post"
            />
            <Button
              label="Publicar"
              icon="send"
              onPress={publish}
              loading={busy === 'post'}
              disabled={!text.trim()}
              testID="button-community-publish"
            />
          </View>
        ) : null}

        {list === null ? <LoadingState message="Cargando publicaciones…" /> : null}
        {list?.length === 0 ? (
          <ThemedText color="textSecondary" style={styles.center}>
            Todavía no hay publicaciones.
          </ThemedText>
        ) : null}
        <View style={styles.gap}>
          {list?.map((post) => (
            <Card key={post.id} style={styles.post} testID={`community-post-${post.id}`}>
              <View style={styles.header}>
                <Pressable
                  onPress={() => router.push(`/profile/${post.author.uid}`)}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver perfil de ${post.author.displayName}`}
                  style={styles.author}>
                  <Avatar uid={post.author.uid} name={post.author.displayName || post.author.username} />
                  <View style={styles.flex}>
                    <ThemedText variant="bodyStrong" numberOfLines={1}>
                      {post.author.displayName}
                    </ThemedText>
                    <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
                      @{post.author.username} · {formatNoteDate(post.createdAt)}
                    </ThemedText>
                  </View>
                </Pressable>
                {post.author.uid === uid || isOwner ? (
                  <Pressable onPress={() => confirmDelete(post)} accessibilityRole="button" accessibilityLabel="Eliminar publicación" hitSlop={12}>
                    <Icon name="delete" size={20} color="textSecondary" />
                  </Pressable>
                ) : null}
              </View>
              <ThemedText selectable>{post.text}</ThemedText>
            </Card>
          ))}
        </View>
        {list && list.length >= max ? (
          <Button
            label="Ver publicaciones anteriores"
            icon="expand_more"
            variant="secondary"
            onPress={() => setMax((m) => m + COMMUNITY_POSTS_PAGE)}
            testID="button-more-community-posts"
          />
        ) : null}
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.md },
  center: { textAlign: 'center' },
  post: { gap: Spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
});

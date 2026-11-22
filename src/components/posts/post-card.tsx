import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Pressable, StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';
import { deletePost, getPostImage, setLiked, toPostsErrorMessage, type Post } from '@/services/posts';
import { formatNoteDate } from '@/utils/date';
import { describeLink } from '@/utils/posts';

export interface PostCardProps {
  post: Post;
  /** uid de la cuenta actual. */
  viewerUid: string;
}

export function PostCard({ post, viewerUid }: PostCardProps) {
  const { colors } = useAppTheme();
  const liked = post.likes.includes(viewerUid);
  const own = post.author.uid === viewerUid;

  const toggleLike = () => {
    setLiked(post.id, viewerUid, !liked).catch((e: unknown) => Alert.alert('No se pudo guardar el «me gusta»', toPostsErrorMessage(e)));
  };

  const confirmDelete = () => {
    Alert.alert('Eliminar publicación', 'Se borrará para todos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          deletePost(post).catch((e: unknown) => Alert.alert('No se pudo eliminar', toPostsErrorMessage(e)));
        },
      },
    ]);
  };

  return (
    <Card style={styles.card} testID={`post-${post.id}`}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: colors.primaryMuted }]}>
          <ThemedText variant="bodyStrong" color="primary">
            {(post.author.displayName || post.author.username).charAt(0).toUpperCase()}
          </ThemedText>
        </View>
        <View style={styles.headerText}>
          <ThemedText variant="bodyStrong" numberOfLines={1}>
            {post.author.displayName}
          </ThemedText>
          <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
            @{post.author.username} · {formatNoteDate(post.createdAt)}
          </ThemedText>
        </View>
        {own ? (
          <Pressable onPress={confirmDelete} accessibilityRole="button" accessibilityLabel="Eliminar publicación" hitSlop={12}>
            <Icon name="delete" size={20} color="textSecondary" />
          </Pressable>
        ) : null}
      </View>

      {post.text ? <ThemedText selectable>{post.text}</ThemedText> : null}
      {post.image ? <PostImage postId={post.id} width={post.image.width} height={post.image.height} /> : null}
      {post.link ? <PostLink link={post.link} /> : null}

      <Pressable
        onPress={toggleLike}
        accessibilityRole="button"
        accessibilityLabel={liked ? 'Quitar me gusta' : 'Me gusta'}
        accessibilityState={{ selected: liked }}
        hitSlop={8}
        style={styles.like}
        testID={`like-${post.id}`}>
        <Icon name="favorite" size={20} color={liked ? 'danger' : 'textSecondary'} />
        <ThemedText variant="caption" color={liked ? 'danger' : 'textSecondary'}>
          {post.likes.length}
        </ThemedText>
      </Pressable>
    </Card>
  );
}

function PostImage({ postId, width, height }: { postId: string; width: number; height: number }) {
  const { colors } = useAppTheme();
  const [data, setData] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getPostImage(postId)
      .then((value) => {
        if (!active) return;
        if (value) setData(value);
        else setFailed(true);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [postId]);

  const aspectRatio = width > 0 && height > 0 ? width / height : 1;
  return (
    <View style={[styles.image, { aspectRatio, backgroundColor: colors.surfaceAlt }]}>
      {data ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${data}` }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          accessibilityLabel="Foto de la publicación"
          testID={`post-image-${postId}`}
        />
      ) : failed ? (
        <Icon name="broken_image" color="textSecondary" />
      ) : (
        <ActivityIndicator color={colors.primary} />
      )}
    </View>
  );
}

function PostLink({ link }: { link: string }) {
  const { colors } = useAppTheme();
  const { host, label } = describeLink(link);
  const open = () => {
    Linking.openURL(link).catch(() => Alert.alert('No se pudo abrir el enlace', link));
  };
  return (
    <Pressable
      onPress={open}
      accessibilityRole="link"
      accessibilityLabel={`Abrir ${label}`}
      style={[styles.link, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Icon name={label === host ? 'link' : 'description'} color="primary" />
      <View style={styles.headerText}>
        <ThemedText variant="bodyStrong" numberOfLines={1}>
          {label}
        </ThemedText>
        <ThemedText variant="caption" color="textSecondary" numberOfLines={1}>
          {host}
        </ThemedText>
      </View>
      <Icon name="open_in_new" size={18} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1, gap: Spacing.xxs },
  image: { width: '100%', maxHeight: 480, borderRadius: Radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  like: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, alignSelf: 'flex-start' },
});

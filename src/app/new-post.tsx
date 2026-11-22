import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { KeyboardAvoidingView, Pressable, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useFriends } from '@/context/friends-context';
import { preparePostImage, type PreparedPostImage } from '@/services/post-media';
import { createPost, toPostsErrorMessage } from '@/services/posts';
import { POST_TEXT_MAX_LENGTH, validatePost } from '@/utils/posts';

export default function NewPostScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { profile } = useFriends();
  const [text, setText] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState<PreparedPostImage | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pickImage = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setPreparing(true);
    try {
      setImage(await preparePostImage({ uri: asset.uri, width: asset.width, height: asset.height }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo preparar la foto.');
    } finally {
      setPreparing(false);
    }
  };

  const publish = async () => {
    if (!profile) return;
    const invalid = validatePost({ text, link, hasImage: image !== null });
    setError(invalid);
    if (invalid) return;
    setPublishing(true);
    try {
      await createPost(profile, { text, link, image: image && { base64: image.base64, width: image.width, height: image.height } });
      router.back();
    } catch (e) {
      setError(toPostsErrorMessage(e));
      setPublishing(false);
    }
  };

  if (!profile) {
    return (
      <Screen testID="new-post-screen">
        <Banner message="Para publicar, primero elige tu nombre de usuario en Amigos." />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Screen testID="new-post-screen">
        {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
        <ThemedText color="textSecondary">
          Publicas como {profile.displayName} (@{profile.username}). Lo verán todas las personas que usan MiApp.
        </ThemedText>
        <TextField
          label="Mensaje"
          placeholder="¿Qué quieres compartir?"
          value={text}
          onChangeText={setText}
          multiline
          numberOfLines={5}
          maxLength={POST_TEXT_MAX_LENGTH}
          textAlignVertical="top"
          testID="input-post-text"
        />
        <TextField
          label="Enlace a un archivo o página (opcional)"
          placeholder="https://drive.google.com/…"
          value={link}
          onChangeText={setLink}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          testID="input-post-link"
        />
        {image ? (
          <View style={[styles.preview, { aspectRatio: image.width / image.height || 1 }]}>
            <Image source={{ uri: image.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Foto elegida" />
            <Pressable
              onPress={() => setImage(null)}
              accessibilityRole="button"
              accessibilityLabel="Quitar foto"
              hitSlop={8}
              style={styles.removeImage}>
              <Icon name="close" size={20} color="onPrimary" />
            </Pressable>
          </View>
        ) : (
          <Button
            label="Añadir foto"
            icon="add_photo_alternate"
            variant="secondary"
            onPress={pickImage}
            loading={preparing}
            testID="button-post-image"
          />
        )}
        <Button label="Publicar" icon="send" onPress={publish} loading={publishing} disabled={preparing} testID="button-publish" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  preview: { width: '100%', maxHeight: 420, borderRadius: Radius.md, overflow: 'hidden' },
  removeImage: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
});

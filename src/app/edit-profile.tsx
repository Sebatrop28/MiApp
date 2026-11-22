import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { prepareAvatar } from '@/services/avatar-media';
import {
  removeAvatar,
  setAvatar,
  subscribeToPublicProfile,
  toProfilesErrorMessage,
  updateProfile,
  type PublicProfile,
} from '@/services/profiles';
import { BIO_MAX_LENGTH } from '@/utils/posts';
import { DISPLAY_NAME_MAX_LENGTH } from '@/utils/username';

export default function EditProfileScreen() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    return subscribeToPublicProfile(user.uid, setProfile, setError);
  }, [user]);

  if (!profile) return error ? <Banner tone="error" message={error} /> : <LoadingState message="Cargando perfil…" />;
  return <EditForm profile={profile} />;
}

function EditForm({ profile }: { profile: PublicProfile }) {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const [displayName, setDisplayName] = useState(profile.displayName);
  const [bio, setBio] = useState(profile.bio);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'save' | 'photo' | null>(null);

  const changePhoto = async () => {
    setError(null);
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset) return;
    setPending('photo');
    try {
      await setAvatar(profile.uid, await prepareAvatar({ uri: asset.uri, width: asset.width, height: asset.height }));
    } catch (e) {
      setError(toProfilesErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const deletePhoto = async () => {
    setPending('photo');
    try {
      await removeAvatar(profile.uid);
    } catch (e) {
      setError(toProfilesErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const save = async () => {
    if (!displayName.trim()) {
      setError('Escribe tu nombre.');
      return;
    }
    setError(null);
    setPending('save');
    try {
      await updateProfile(profile.uid, { displayName, bio });
      router.back();
    } catch (e) {
      setError(toProfilesErrorMessage(e));
      setPending(null);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Screen testID="edit-profile-screen">
        {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
        <View style={styles.photo}>
          <Avatar uid={profile.uid} name={displayName} size={96} version={profile.avatarUpdatedAt} />
          <View style={styles.photoButtons}>
            <Button
              label="Cambiar foto"
              icon="add_a_photo"
              variant="secondary"
              onPress={changePhoto}
              loading={pending === 'photo'}
              testID="button-change-avatar"
            />
            {profile.avatarUpdatedAt ? (
              <Button label="Quitar foto" icon="delete" variant="danger" onPress={deletePhoto} disabled={pending !== null} />
            ) : null}
          </View>
        </View>
        <ThemedText color="textSecondary">@{profile.username} (el nombre de usuario no se puede cambiar)</ThemedText>
        <TextField
          label="Nombre"
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={DISPLAY_NAME_MAX_LENGTH}
          testID="input-display-name"
        />
        <TextField
          label={`Descripción (${bio.length}/${BIO_MAX_LENGTH})`}
          placeholder="Cuéntale a la gente quién eres"
          value={bio}
          onChangeText={setBio}
          multiline
          numberOfLines={3}
          maxLength={BIO_MAX_LENGTH}
          textAlignVertical="top"
          testID="input-bio"
        />
        <Button label="Guardar" icon="check" onPress={save} loading={pending === 'save'} disabled={pending === 'photo'} testID="button-save-profile" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  photo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.lg },
  photoButtons: { flex: 1, gap: Spacing.sm },
});

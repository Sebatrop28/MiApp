import { useRouter } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useState } from 'react';
import { KeyboardAvoidingView, StyleSheet } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { useFriends } from '@/context/friends-context';
import { createCommunity, toCommunitiesErrorMessage } from '@/services/communities';
import { COMMUNITY_DESCRIPTION_MAX_LENGTH, COMMUNITY_NAME_MAX_LENGTH, validateCommunity } from '@/utils/communities';

export default function NewCommunityScreen() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { profile } = useFriends();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const create = async () => {
    if (!profile) return;
    const invalid = validateCommunity({ name, description });
    setError(invalid);
    if (invalid) return;
    setCreating(true);
    try {
      const id = await createCommunity(profile, { name, description });
      router.replace(`/community/${id}`);
    } catch (e) {
      setError(toCommunitiesErrorMessage(e));
      setCreating(false);
    }
  };

  if (!profile) {
    return (
      <Screen testID="new-community-screen">
        <Banner message="Para crear una comunidad, primero elige tu nombre de usuario en Amigos." />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding" keyboardVerticalOffset={headerHeight}>
      <Screen testID="new-community-screen">
        {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
        <ThemedText color="textSecondary">
          Cualquier persona podrá encontrarla y unirse. Solo los miembros pueden publicar, y solo texto.
        </ThemedText>
        <TextField
          label="Nombre"
          placeholder="Ej.: Fotografía en La Paz"
          value={name}
          onChangeText={setName}
          maxLength={COMMUNITY_NAME_MAX_LENGTH}
          testID="input-community-name"
        />
        <TextField
          label={`Descripción (${description.length}/${COMMUNITY_DESCRIPTION_MAX_LENGTH})`}
          placeholder="¿De qué trata esta comunidad?"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={4}
          maxLength={COMMUNITY_DESCRIPTION_MAX_LENGTH}
          textAlignVertical="top"
          testID="input-community-description"
        />
        <Button label="Crear comunidad" icon="add" onPress={create} loading={creating} testID="button-create-community" />
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});

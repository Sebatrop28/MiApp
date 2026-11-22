import { useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useFriends } from '@/context/friends-context';
import { toFriendsErrorMessage, type UserProfile } from '@/services/friends';
import { normalizeUsername, validateUsername } from '@/utils/username';

/** Buscar a alguien por su @usuario para ver su perfil y seguirlo. */
export default function SearchScreen() {
  const router = useRouter();
  const { findUser } = useFriends();
  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<UserProfile | null>(null);
  const [searching, setSearching] = useState(false);

  const search = async () => {
    const invalid = validateUsername(username);
    setFieldError(invalid);
    setError(null);
    setResult(null);
    if (invalid) return;
    setSearching(true);
    try {
      const found = await findUser(username);
      if (found) setResult(found);
      else setError(`No existe ningún usuario @${normalizeUsername(username)}.`);
    } catch (e) {
      setError(toFriendsErrorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  return (
    <Screen testID="search-screen">
      {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
      <TextField
        label="Nombre de usuario"
        placeholder="@usuario"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        error={fieldError}
        onSubmitEditing={search}
        returnKeyType="search"
        testID="input-search-username"
      />
      <Button label="Buscar" icon="search" onPress={search} loading={searching} testID="button-search" />
      {result ? (
        <Card
          onPress={() => router.push(`/profile/${result.uid}`)}
          accessibilityLabel={`Ver perfil de ${result.displayName}`}
          testID="search-result">
          <View style={styles.row}>
            <Avatar uid={result.uid} name={result.displayName} size={48} />
            <View style={styles.texts}>
              <ThemedText variant="heading">{result.displayName}</ThemedText>
              <ThemedText color="textSecondary">@{result.username}</ThemedText>
            </View>
          </View>
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  texts: { flex: 1, gap: Spacing.xxs },
});

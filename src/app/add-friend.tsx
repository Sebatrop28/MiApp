import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useFriends } from '@/context/friends-context';
import { toFriendsErrorMessage, type UserProfile } from '@/services/friends';
import { normalizeUsername, validateUsername } from '@/utils/username';

export default function AddFriendScreen() {
  const { findUser, sendRequest } = useFriends();
  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [result, setResult] = useState<UserProfile | null>(null);
  const [pending, setPending] = useState<'search' | 'send' | null>(null);

  const search = async () => {
    const invalid = validateUsername(username);
    setFieldError(invalid);
    setError(null);
    setNotice(null);
    setResult(null);
    if (invalid) return;
    setPending('search');
    try {
      const found = await findUser(username);
      if (found) setResult(found);
      else setError(`No existe ningún usuario @${normalizeUsername(username)}.`);
    } catch (e) {
      setError(toFriendsErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  const send = async (to: UserProfile) => {
    setError(null);
    setPending('send');
    try {
      const outcome = await sendRequest(to);
      setNotice(
        outcome === 'accepted'
          ? `@${to.username} ya te había enviado una solicitud: ahora son amigos.`
          : `Solicitud enviada a @${to.username}. Aparecerá en su lista cuando la acepte.`,
      );
      setResult(null);
      setUsername('');
    } catch (e) {
      setError(toFriendsErrorMessage(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <Screen testID="add-friend-screen">
      {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
      {notice ? <Banner message={notice} onDismiss={() => setNotice(null)} /> : null}
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
        testID="input-friend-username"
      />
      <Button label="Buscar" icon="search" onPress={search} loading={pending === 'search'} testID="button-search-friend" />
      {result ? (
        <Card style={styles.result} testID="friend-result">
          <ThemedText variant="heading">{result.displayName}</ThemedText>
          <ThemedText color="textSecondary">@{result.username}</ThemedText>
          <Button
            label="Enviar solicitud"
            icon="person_add"
            onPress={() => send(result)}
            loading={pending === 'send'}
            testID="button-send-request"
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  result: { gap: Spacing.sm },
});

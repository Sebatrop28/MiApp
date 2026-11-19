import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListGroup } from '@/components/ui/list-group';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useFriends } from '@/context/friends-context';
import { useAppTheme } from '@/hooks/use-theme';
import { toFriendsErrorMessage, type FriendRequest } from '@/services/friends';
import { validateUsername } from '@/utils/username';

export default function FriendsScreen() {
  const { status, error, profile, retry } = useFriends();

  return (
    <Screen
      title="Amigos"
      subtitle={profile ? `Tu usuario: @${profile.username}` : 'Agrega a la gente con la que quieres hablar'}
      testID="friends-screen">
      {error ? <Banner tone="error" message={error} onDismiss={retry} /> : null}
      {status === 'loading' ? (
        <LoadingState message="Cargando amigos…" />
      ) : profile ? (
        <FriendsContent />
      ) : (
        <ChooseUsername />
      )}
    </Screen>
  );
}

function ChooseUsername() {
  const { createProfile } = useFriends();
  const [username, setUsername] = useState('');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const invalid = validateUsername(username);
    setFieldError(invalid);
    setFormError(null);
    if (invalid) return;
    setSaving(true);
    try {
      await createProfile(username);
    } catch (e) {
      setFormError(toFriendsErrorMessage(e));
      setSaving(false);
    }
  };

  return (
    <Card style={styles.form}>
      <ThemedText variant="heading">Elige tu nombre de usuario</ThemedText>
      <ThemedText color="textSecondary">
        Tus amigos te encontrarán con él. Es único y no se puede cambiar después.
      </ThemedText>
      {formError ? <Banner tone="error" message={formError} onDismiss={() => setFormError(null)} /> : null}
      <TextField
        label="Nombre de usuario"
        placeholder="por_ejemplo"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
        error={fieldError}
        onSubmitEditing={submit}
        testID="input-username"
      />
      <Button label="Guardar" icon="check" onPress={submit} loading={saving} testID="button-save-username" />
    </Card>
  );
}

function FriendsContent() {
  const router = useRouter();
  const { friends, incoming, outgoing, acceptRequest, deleteRequest, removeFriend } = useFriends();
  const [actionError, setActionError] = useState<string | null>(null);

  const attempt = (action: Promise<void>) => {
    setActionError(null);
    action.catch((e: unknown) => setActionError(toFriendsErrorMessage(e)));
  };

  const confirmRemove = (friend: (typeof friends)[number]) => {
    Alert.alert(friend.profile.displayName, `@${friend.profile.username}`, [
      { text: 'Cerrar', style: 'cancel' },
      { text: 'Eliminar amigo', style: 'destructive', onPress: () => attempt(removeFriend(friend)) },
    ]);
  };

  return (
    <>
      {actionError ? <Banner tone="error" message={actionError} onDismiss={() => setActionError(null)} /> : null}
      <Button label="Añadir amigo" icon="person_add" onPress={() => router.push('/add-friend')} testID="button-add-friend" />

      {incoming.length > 0 ? (
        <Section title="Solicitudes recibidas">
          {incoming.map((request) => (
            <IncomingRequest
              key={request.id}
              request={request}
              onAccept={() => attempt(acceptRequest(request))}
              onDecline={() => attempt(deleteRequest(request))}
            />
          ))}
        </Section>
      ) : null}

      <Section title={`Amigos (${friends.length})`}>
        {friends.length === 0 ? (
          <EmptyFriends />
        ) : (
          <ListGroup>
            {friends.map((friend) => (
              <ListRow
                key={friend.friendshipId}
                icon="person"
                title={friend.profile.displayName}
                description={`@${friend.profile.username}`}
                onPress={() => confirmRemove(friend)}
                testID={`friend-${friend.profile.username}`}
              />
            ))}
          </ListGroup>
        )}
      </Section>

      {outgoing.length > 0 ? (
        <Section title="Solicitudes enviadas">
          <ListGroup>
            {outgoing.map((request) => (
              <ListRow
                key={request.id}
                icon="schedule_send"
                title={request.to.displayName}
                description={`@${request.to.username} · pendiente`}
                trailing={
                  <Button
                    label="Cancelar"
                    variant="secondary"
                    onPress={() => attempt(deleteRequest(request))}
                    testID={`cancel-${request.to.username}`}
                  />
                }
              />
            ))}
          </ListGroup>
        </Section>
      ) : null}
    </>
  );
}

function IncomingRequest({
  request,
  onAccept,
  onDecline,
}: {
  request: FriendRequest;
  onAccept: () => void;
  onDecline: () => void;
}) {
  return (
    <Card style={styles.request} testID={`request-${request.from.username}`}>
      <ThemedText variant="bodyStrong">{request.from.displayName}</ThemedText>
      <ThemedText variant="caption" color="textSecondary">
        @{request.from.username} quiere ser tu amigo
      </ThemedText>
      <View style={styles.requestActions}>
        <View style={styles.flex}>
          <Button label="Aceptar" icon="check" onPress={onAccept} testID={`accept-${request.from.username}`} />
        </View>
        <View style={styles.flex}>
          <Button label="Rechazar" variant="secondary" onPress={onDecline} testID={`decline-${request.from.username}`} />
        </View>
      </View>
    </Card>
  );
}

function EmptyFriends() {
  const { colors } = useAppTheme();
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.primaryMuted }]}>
        <Icon name="group" size={32} color="primary" />
      </View>
      <ThemedText variant="heading">Aún no tienes amigos</ThemedText>
      <ThemedText color="textSecondary" style={styles.emptyText}>
        Toca «Añadir amigo» y busca a alguien por su nombre de usuario.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: Spacing.md },
  request: { gap: Spacing.xs },
  requestActions: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.sm },
  flex: { flex: 1 },
  empty: { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xl },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  emptyText: { textAlign: 'center' },
});

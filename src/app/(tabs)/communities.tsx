import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { SkeletonList } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ListGroup } from '@/components/ui/list-group';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { TextField } from '@/components/ui/text-field';
import { ThemedText } from '@/components/ui/themed-text';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth-context';
import { useFriends } from '@/context/friends-context';
import { useAppTheme } from '@/hooks/use-theme';
import {
  searchCommunities,
  subscribeToMyCommunities,
  subscribeToPopularCommunities,
  toCommunitiesErrorMessage,
  type Community,
  type Membership,
} from '@/services/communities';

const members = (n: number) => (n === 1 ? '1 miembro' : `${n} miembros`);

/** Comunidades: espacios públicos de texto que crea cualquier persona. */
export default function CommunitiesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const { profile, status: profileStatus } = useFriends();
  const uid = profile ? user?.uid : undefined;
  const [mine, setMine] = useState<Membership[] | null>(null);
  const [popular, setPopular] = useState<Community[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Community[] | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const stopMine = subscribeToMyCommunities(uid, setMine, setError);
    const stopPopular = subscribeToPopularCommunities(setPopular, setError);
    return () => {
      stopMine();
      stopPopular();
    };
  }, [uid]);

  const runSearch = async () => {
    if (!search.trim()) {
      setResults(null);
      return;
    }
    setSearching(true);
    setError(null);
    try {
      setResults(await searchCommunities(search));
    } catch (e) {
      setError(toCommunitiesErrorMessage(e));
    } finally {
      setSearching(false);
    }
  };

  const open = (id: string) => router.push(`/community/${id}`);

  return (
    <Screen
      title="Comunidades"
      subtitle="Espacios de texto para conversar sobre lo que te gusta"
      headerRight={
        profile ? (
          <Pressable
            onPress={() => router.push('/new-community')}
            accessibilityRole="button"
            accessibilityLabel="Crear comunidad"
            hitSlop={8}
            style={[styles.headerButton, { backgroundColor: colors.primaryMuted }]}
            testID="button-new-community">
            <Icon name="add" size={22} color="primary" />
          </Pressable>
        ) : null
      }
      testID="communities-screen">
      {!profile && profileStatus === 'ready' ? (
        <View style={styles.gap}>
          <Banner message="Para unirte a comunidades, primero elige tu nombre de usuario en Amigos." />
          <Button label="Ir a Amigos" icon="group" variant="secondary" onPress={() => router.navigate('/friends')} />
        </View>
      ) : null}
      {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}

      {profile ? (
        <>
          <View style={styles.gap}>
            <TextField
              label="Buscar comunidades"
              placeholder="Nombre de la comunidad"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={runSearch}
              returnKeyType="search"
              testID="input-search-community"
            />
            <Button label="Buscar" icon="search" variant="secondary" onPress={runSearch} loading={searching} testID="button-search-community" />
          </View>

          {results ? (
            <Section title="Resultados">
              {results.length === 0 ? (
                <ThemedText color="textSecondary">No hay comunidades con ese nombre.</ThemedText>
              ) : (
                <CommunityList communities={results} onOpen={open} />
              )}
            </Section>
          ) : null}

          <Section title="Mis comunidades">
            {mine === null ? (
              <SkeletonList count={2} />
            ) : mine.length === 0 ? (
              <ThemedText color="textSecondary">Todavía no estás en ninguna. Únete a una o crea la tuya.</ThemedText>
            ) : (
              <ListGroup>
                {mine.map((m) => (
                  <ListRow key={m.communityId} icon="groups" title={m.name} onPress={() => open(m.communityId)} showChevron />
                ))}
              </ListGroup>
            )}
          </Section>

          <Section title="Populares">
            {popular === null ? (
              <SkeletonList count={3} />
            ) : popular.length === 0 ? (
              <ThemedText color="textSecondary">Aún no hay comunidades. ¡Crea la primera!</ThemedText>
            ) : (
              <CommunityList communities={popular} onOpen={open} />
            )}
          </Section>
        </>
      ) : null}
    </Screen>
  );
}

function CommunityList({ communities, onOpen }: { communities: Community[]; onOpen: (id: string) => void }) {
  return (
    <ListGroup>
      {communities.map((c) => (
        <ListRow
          key={c.id}
          icon="groups"
          title={c.name}
          description={c.description ? `${members(c.memberCount)} · ${c.description}` : members(c.memberCount)}
          onPress={() => onOpen(c.id)}
          showChevron
          testID={`community-${c.id}`}
        />
      ))}
    </ListGroup>
  );
}

const styles = StyleSheet.create({
  gap: { gap: Spacing.md },
  headerButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

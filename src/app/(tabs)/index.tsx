import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/error-state';
import { SkeletonList } from '@/components/feedback/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon, type IconName } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';
import { useAsync } from '@/hooks/use-async';
import { useAppTheme } from '@/hooks/use-theme';
import { fetchHighlights, type Highlight } from '@/services/content';
import { getGreeting } from '@/utils/greeting';

export default function HomeScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { settings } = useSettings();

  const loadHighlights = useCallback(
    () => fetchHighlights({ simulateError: settings.simulateNetworkErrors }),
    [settings.simulateNetworkErrors],
  );
  const highlights = useAsync(loadHighlights);

  return (
    <Screen
      title={getGreeting()}
      subtitle="Bienvenido a MiApp"
      refreshing={highlights.status === 'refreshing'}
      onRefresh={highlights.refresh}
      testID="home-screen">
      <View style={[styles.hero, { backgroundColor: colors.primary }]}>
        <View style={[styles.heroIcon, { backgroundColor: colors.onPrimary }]}>
          <Icon name="rocket_launch" size={28} color="primary" />
        </View>
        <ThemedText variant="title" color="onPrimary">
          Tu app Android, lista para crecer
        </ThemedText>
        <ThemedText color="onPrimary" style={styles.heroText}>
          Base profesional con Expo Router, TypeScript, temas y EAS Build configurados.
        </ThemedText>
      </View>

      <Section title="Accesos rápidos">
        <View style={styles.quickGrid}>
          <QuickAction
            icon="tune"
            title="Ajustes"
            description="Tema y preferencias"
            onPress={() => router.navigate('/settings')}
          />
          <QuickAction
            icon="info"
            title="Información"
            description="Versión y dispositivo"
            onPress={() => router.navigate('/about')}
          />
        </View>
      </Section>

      <Section title="Novedades">
        {highlights.status === 'loading' ? <SkeletonList count={3} /> : null}

        {highlights.status === 'error' ? (
          <ErrorState
            title="No se pudo cargar el contenido"
            message={highlights.error ?? ''}
            onRetry={highlights.reload}
          />
        ) : null}

        {(highlights.status === 'success' || highlights.status === 'refreshing') && highlights.data ? (
          highlights.data.length === 0 ? (
            <ThemedText color="textSecondary">No hay novedades por ahora.</ThemedText>
          ) : (
            <View style={styles.list}>
              {highlights.data.map((item) => (
                <HighlightCard key={item.id} item={item} />
              ))}
            </View>
          )
        ) : null}
      </Section>

      <Button label="Ver información de la app" icon="arrow_forward" onPress={() => router.navigate('/about')} />
    </Screen>
  );
}

interface QuickActionProps {
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
}

function QuickAction({ icon, title, description, onPress }: QuickActionProps) {
  const { colors } = useAppTheme();
  return (
    <Card onPress={onPress} style={styles.quickCard} accessibilityLabel={title} accessibilityHint={description}>
      <View style={[styles.quickIcon, { backgroundColor: colors.primaryMuted }]}>
        <Icon name={icon} size={22} color="primary" />
      </View>
      <ThemedText variant="heading">{title}</ThemedText>
      <ThemedText variant="caption" color="textSecondary">
        {description}
      </ThemedText>
    </Card>
  );
}

function HighlightCard({ item }: { item: Highlight }) {
  const { colors } = useAppTheme();
  return (
    <Card style={styles.highlight} testID={`highlight-${item.id}`}>
      <View style={[styles.highlightIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Icon name={item.icon} size={22} color="primary" />
      </View>
      <View style={styles.highlightTexts}>
        <ThemedText variant="bodyStrong">{item.title}</ThemedText>
        <ThemedText variant="caption" color="textSecondary">
          {item.description}
        </ThemedText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  hero: {
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    gap: Spacing.sm,
  },
  heroIcon: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  heroText: { opacity: 0.9 },
  quickGrid: { flexDirection: 'row', gap: Spacing.md },
  quickCard: { flex: 1, gap: Spacing.xs },
  quickIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  list: { gap: Spacing.sm },
  highlight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  highlightIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  highlightTexts: { flex: 1, gap: Spacing.xxs },
});

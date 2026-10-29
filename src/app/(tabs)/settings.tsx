import { useRouter } from 'expo-router';
import { Alert, Switch } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { ListGroup } from '@/components/ui/list-group';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Section } from '@/components/ui/section';
import { useSettings } from '@/context/settings-context';
import { useAppTheme } from '@/hooks/use-theme';
import type { ThemeMode } from '@/services/settings-storage';

const THEME_OPTIONS: readonly SegmentedOption<ThemeMode>[] = [
  { value: 'system', label: 'Sistema', icon: 'brightness_auto' },
  { value: 'light', label: 'Claro', icon: 'light_mode' },
  { value: 'dark', label: 'Oscuro', icon: 'dark_mode' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const { settings, status, error, updateSetting, resetSettings, dismissError } = useSettings();

  const switchColors = {
    trackColor: { false: colors.border, true: colors.primary },
    thumbColor: colors.surface,
  };

  const confirmReset = () => {
    Alert.alert('Restablecer ajustes', 'Se restaurarán todas las preferencias a sus valores originales.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restablecer', style: 'destructive', onPress: () => void resetSettings() },
    ]);
  };

  return (
    <Screen title="Ajustes" subtitle="Personaliza tu experiencia" testID="settings-screen">
      {error ? <Banner tone="error" message={error} onDismiss={dismissError} /> : null}

      {status === 'loading' ? (
        <LoadingState message="Cargando ajustes…" />
      ) : (
        <>
          <Section title="Apariencia">
            <SegmentedControl
              accessibilityLabel="Tema de la aplicación"
              options={THEME_OPTIONS}
              value={settings.themeMode}
              onChange={(mode) => void updateSetting('themeMode', mode)}
            />
          </Section>

          <Section title="Preferencias">
            <ListGroup>
              <ListRow
                icon="notifications"
                title="Notificaciones"
                description="Recibir avisos de novedades (preferencia guardada localmente)."
                trailing={
                  <Switch
                    value={settings.notificationsEnabled}
                    onValueChange={(value) => void updateSetting('notificationsEnabled', value)}
                    accessibilityLabel="Notificaciones"
                    testID="switch-notifications"
                    {...switchColors}
                  />
                }
              />
            </ListGroup>
          </Section>

          <Section title="Desarrollo">
            <ListGroup>
              <ListRow
                icon="bug_report"
                title="Simular errores de red"
                description="Fuerza fallos en la carga de Inicio para probar los mensajes de error."
                trailing={
                  <Switch
                    value={settings.simulateNetworkErrors}
                    onValueChange={(value) => void updateSetting('simulateNetworkErrors', value)}
                    accessibilityLabel="Simular errores de red"
                    testID="switch-simulate-errors"
                    {...switchColors}
                  />
                }
              />
            </ListGroup>
          </Section>

          <Section title="Más">
            <ListGroup>
              <ListRow
                icon="info"
                title="Información de la app"
                description="Versión, dispositivo y tecnologías"
                onPress={() => router.navigate('/about')}
                showChevron
              />
            </ListGroup>
          </Section>

          <Button label="Restablecer ajustes" icon="restart_alt" variant="danger" onPress={confirmReset} />
        </>
      )}
    </Screen>
  );
}

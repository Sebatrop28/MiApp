import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { LoadingState } from '@/components/feedback/loading-state';
import { Button } from '@/components/ui/button';
import { ListGroup } from '@/components/ui/list-group';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { Section } from '@/components/ui/section';
import { useAuth } from '@/context/auth-context';
import { useSettings } from '@/context/settings-context';
import { useAppTheme } from '@/hooks/use-theme';
import { toAuthErrorMessage } from '@/services/auth-errors';
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
  const { user, signOut } = useAuth();
  const [signOutError, setSignOutError] = useState<string | null>(null);

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

  const confirmSignOut = () => {
    Alert.alert('Cerrar sesión', 'Tendrás que volver a iniciar sesión para usar la app.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: () => {
          setSignOutError(null);
          signOut().catch((e: unknown) => setSignOutError(toAuthErrorMessage(e)));
        },
      },
    ]);
  };

  const accountDetails = [
    user?.displayName ? user.email : null,
    user?.provider === 'google' ? 'Cuenta de Google' : user?.emailVerified === false ? 'Correo sin verificar' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Screen title="Ajustes" subtitle="Personaliza tu experiencia" testID="settings-screen">
      {error ? <Banner tone="error" message={error} onDismiss={dismissError} /> : null}
      {signOutError ? <Banner tone="error" message={signOutError} onDismiss={() => setSignOutError(null)} /> : null}

      <Section title="Cuenta">
        <ListGroup>
          <ListRow
            icon="account_circle"
            title={user?.displayName || user?.email || 'Tu cuenta'}
            description={accountDetails || undefined}
            testID="account-row"
          />
        </ListGroup>
        <Button label="Cerrar sesión" icon="logout" variant="secondary" onPress={confirmSignOut} testID="button-sign-out" />
      </Section>

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
                tone="accent"
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
                tone="warning"
                title="Simular errores de red"
                description="Fuerza un fallo al cargar las publicaciones de Inicio para probar los mensajes de error."
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
                icon="system_update"
                tone="success"
                title="Actualizaciones"
                description={settings.autoUpdate ? 'Automáticas activadas' : 'Automáticas desactivadas'}
                onPress={() => router.navigate('/updates')}
                showChevron
              />
              <ListRow
                icon="info"
                tone="info"
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

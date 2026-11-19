import { useState } from 'react';
import { Switch } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { Button } from '@/components/ui/button';
import { ListGroup } from '@/components/ui/list-group';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { useSettings } from '@/context/settings-context';
import { useAppTheme } from '@/hooks/use-theme';
import { applyUpdate, downloadUpdateIfAvailable, getCurrentUpdateInfo, updatesSupported } from '@/services/app-updates';
import { toErrorMessage } from '@/utils/errors';

type CheckState = 'idle' | 'checking' | 'upToDate' | 'ready' | 'error';

export default function UpdatesScreen() {
  const { colors } = useAppTheme();
  const { settings, updateSetting } = useSettings();
  const [state, setState] = useState<CheckState>('idle');
  const [error, setError] = useState<string | null>(null);
  const current = getCurrentUpdateInfo();

  const check = async () => {
    setState('checking');
    setError(null);
    try {
      setState((await downloadUpdateIfAvailable()) ? 'ready' : 'upToDate');
    } catch (e) {
      setError(`No se pudo buscar actualizaciones: ${toErrorMessage(e)}`);
      setState('error');
    }
  };

  const restart = async () => {
    try {
      await applyUpdate();
    } catch (e) {
      setError(`No se pudo reiniciar la app: ${toErrorMessage(e)}`);
    }
  };

  const installed = current.isEmbedded
    ? 'La incluida en el APK'
    : current.createdAt
      ? `Publicada el ${current.createdAt.toLocaleString()}`
      : 'Actualización descargada';

  return (
    <Screen subtitle="Recibe mejoras sin reinstalar la app" testID="updates-screen">
      {!updatesSupported ? (
        <Banner
          tone="info"
          message="Las actualizaciones solo funcionan en la app instalada desde el APK, no en Expo Go ni en la web."
        />
      ) : null}
      {error ? <Banner tone="error" message={error} onDismiss={() => setError(null)} /> : null}
      {state === 'upToDate' ? <Banner tone="info" message="Ya tienes la versión más reciente." /> : null}
      {state === 'ready' ? (
        <Banner tone="info" message="Actualización descargada. Reinicia la app para aplicarla." />
      ) : null}

      <Section title="Automáticas">
        <ListGroup>
          <ListRow
            icon="autorenew"
            title="Actualizar automáticamente"
            description="Al abrir la app se descarga la versión nueva y te pregunta si quieres reiniciar."
            trailing={
              <Switch
                value={settings.autoUpdate}
                onValueChange={(value) => void updateSetting('autoUpdate', value)}
                accessibilityLabel="Actualizar automáticamente"
                testID="switch-auto-update"
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={colors.surface}
              />
            }
          />
        </ListGroup>
      </Section>

      <Section title="Versión instalada">
        <ListGroup>
          <ListRow icon="system_update" title={installed} description={current.channel ? `Canal: ${current.channel}` : undefined} />
        </ListGroup>
      </Section>

      {state === 'ready' ? (
        <Button label="Reiniciar y actualizar" icon="restart_alt" onPress={() => void restart()} testID="button-apply-update" />
      ) : (
        <Button
          label="Buscar actualizaciones"
          icon="refresh"
          onPress={() => void check()}
          loading={state === 'checking'}
          disabled={!updatesSupported || state === 'checking'}
          testID="button-check-updates"
        />
      )}
    </Screen>
  );
}

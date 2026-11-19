import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { useSettings } from '@/context/settings-context';
import { applyUpdate, downloadUpdateIfAvailable, updatesSupported } from '@/services/app-updates';

/** Si «Actualizar automáticamente» está activo, descarga la actualización al abrir la app y ofrece reiniciar. */
export function useAutoUpdate() {
  const { settings, status } = useSettings();
  const checked = useRef(false);

  useEffect(() => {
    if (!updatesSupported || status !== 'ready' || !settings.autoUpdate || checked.current) return;
    checked.current = true;
    downloadUpdateIfAvailable()
      .then((ready) => {
        if (!ready) return;
        Alert.alert('Actualización lista', 'Hay una versión nueva de MiApp. Se aplicará al reiniciar la app.', [
          { text: 'Más tarde', style: 'cancel' },
          { text: 'Reiniciar ahora', onPress: () => void applyUpdate().catch(() => {}) },
        ]);
      })
      .catch(() => {
        // Sin conexión o servidor no disponible: se vuelve a intentar en el próximo arranque.
      });
  }, [settings.autoUpdate, status]);
}

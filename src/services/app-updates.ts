import * as Updates from 'expo-updates';
import { Platform } from 'react-native';

/** Las actualizaciones solo funcionan en el APK/AAB de EAS (no en Expo Go, desarrollo ni web). */
// En web `isEnabled` es `true` pero el módulo no descarga actualizaciones.
export const updatesSupported = Platform.OS !== 'web' && Updates.isEnabled;

export interface CurrentUpdateInfo {
  /** `true` si se ejecuta el código incluido en el APK (sin actualizaciones descargadas). */
  isEmbedded: boolean;
  createdAt: Date | null;
  channel: string | null;
  runtimeVersion: string | null;
}

export function getCurrentUpdateInfo(): CurrentUpdateInfo {
  return {
    isEmbedded: Updates.isEmbeddedLaunch,
    createdAt: Updates.createdAt,
    channel: Updates.channel,
    runtimeVersion: Updates.runtimeVersion,
  };
}

/**
 * Busca y descarga una actualización. Devuelve `true` si quedó una lista para aplicar
 * (se aplica con `applyUpdate()` o al volver a abrir la app).
 */
export async function downloadUpdateIfAvailable(): Promise<boolean> {
  if (!updatesSupported) return false;
  const check = await Updates.checkForUpdateAsync();
  if (!check.isAvailable) return false;
  const result = await Updates.fetchUpdateAsync();
  return result.isNew || result.isRollBackToEmbedded;
}

/** Reinicia la app con la última actualización descargada. */
export async function applyUpdate(): Promise<void> {
  await Updates.reloadAsync();
}

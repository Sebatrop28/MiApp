import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistencia de los ajustes del usuario en el almacenamiento local del dispositivo.
 */

export type ThemeMode = 'system' | 'light' | 'dark';

export interface Settings {
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  /** Opción de desarrollo: fuerza fallos en las cargas de datos para probar los estados de error. */
  simulateNetworkErrors: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  themeMode: 'system',
  notificationsEnabled: true,
  simulateNetworkErrors: false,
};

export const SETTINGS_STORAGE_KEY = '@miapp/settings/v1';

const THEME_MODES: readonly ThemeMode[] = ['system', 'light', 'dark'];

/**
 * Valida datos desconocidos (p. ej. JSON guardado por una versión anterior)
 * y devuelve siempre un objeto `Settings` completo y seguro.
 */
export function sanitizeSettings(raw: unknown): Settings {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_SETTINGS };
  }
  const value = raw as Record<string, unknown>;
  return {
    themeMode: THEME_MODES.includes(value.themeMode as ThemeMode)
      ? (value.themeMode as ThemeMode)
      : DEFAULT_SETTINGS.themeMode,
    notificationsEnabled:
      typeof value.notificationsEnabled === 'boolean'
        ? value.notificationsEnabled
        : DEFAULT_SETTINGS.notificationsEnabled,
    simulateNetworkErrors:
      typeof value.simulateNetworkErrors === 'boolean'
        ? value.simulateNetworkErrors
        : DEFAULT_SETTINGS.simulateNetworkErrors,
  };
}

export async function loadSettings(): Promise<Settings> {
  const stored = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
  if (stored === null) {
    return { ...DEFAULT_SETTINGS };
  }
  try {
    return sanitizeSettings(JSON.parse(stored));
  } catch {
    // JSON corrupto: se descartan los datos y se usan los valores por defecto.
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export async function clearSettings(): Promise<void> {
  await AsyncStorage.removeItem(SETTINGS_STORAGE_KEY);
}

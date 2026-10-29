import { useColorScheme } from 'react-native';

import { Colors, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';

export interface AppTheme {
  scheme: ColorScheme;
  colors: ThemeColors;
}

/**
 * Devuelve la paleta activa combinando la preferencia del usuario
 * (Sistema / Claro / Oscuro) con el esquema de color del sistema.
 */
export function useAppTheme(): AppTheme {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();
  const scheme: ColorScheme =
    settings.themeMode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : settings.themeMode;
  return { scheme, colors: Colors[scheme] };
}

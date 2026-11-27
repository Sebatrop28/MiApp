import { useColorScheme } from 'react-native';

import { BrandGradient, Colors, Elevation, type ColorScheme, type ThemeColors } from '@/constants/theme';
import { useSettings } from '@/context/settings-context';

export interface AppTheme {
  scheme: ColorScheme;
  colors: ThemeColors;
  /** Degradado de marca (`backgroundImage`). */
  gradient: string;
  /** Sombra de las superficies elevadas (`boxShadow`). */
  shadow: string;
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
  return { scheme, colors: Colors[scheme], gradient: BrandGradient[scheme], shadow: Elevation[scheme] };
}

/**
 * Sistema de diseño de MiApp: colores (claro/oscuro), espaciado, radios y tipografía.
 * Todos los componentes deben consumir estos tokens en lugar de valores sueltos
 * para mantener una apariencia coherente.
 */

export const Colors = {
  light: {
    primary: '#4F46E5',
    primaryMuted: '#E0E7FF',
    onPrimary: '#FFFFFF',
    background: '#F5F6FB',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF0F7',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    success: '#15803D',
    danger: '#DC2626',
    dangerSurface: '#FEE2E2',
    info: '#2563EB',
    infoSurface: '#DBEAFE',
    skeleton: '#E2E8F0',
  },
  dark: {
    primary: '#818CF8',
    primaryMuted: '#272E5A',
    onPrimary: '#0B1020',
    background: '#0B1020',
    surface: '#151B2E',
    surfaceAlt: '#1E2640',
    text: '#F1F5F9',
    textSecondary: '#94A3B8',
    border: '#26304A',
    success: '#4ADE80',
    danger: '#F87171',
    dangerSurface: '#3B1219',
    info: '#60A5FA',
    infoSurface: '#172554',
    skeleton: '#26304A',
  },
} as const;

export type ColorScheme = keyof typeof Colors;
export type ThemeColors = { [K in keyof typeof Colors.light]: string };
export type ThemeColor = keyof ThemeColors;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const Typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '700' },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '700' },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.6 },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Ancho máximo del contenido para que se vea bien en tablets y pantallas plegables. */
export const MaxContentWidth = 640;

/** Espacio inferior reservado para que la barra de pestañas no tape el contenido. */
export const BottomTabInset = 96;

/**
 * Sistema de diseño de MiApp: colores (claro/oscuro), espaciado, radios y tipografía.
 * Todos los componentes deben consumir estos tokens en lugar de valores sueltos
 * para mantener una apariencia coherente.
 */

export const Colors = {
  light: {
    primary: '#6C4DF6',
    primaryMuted: '#EEEAFF',
    onPrimary: '#FFFFFF',
    accent: '#F0508C',
    accentSurface: '#FDE7F0',
    background: '#F6F5FB',
    surface: '#FFFFFF',
    surfaceAlt: '#F1EFF8',
    text: '#1A1530',
    textSecondary: '#6B6785',
    border: '#ECE9F4',
    success: '#16A34A',
    successSurface: '#DCFCE7',
    warning: '#D97706',
    warningSurface: '#FEF3C7',
    danger: '#E11D48',
    dangerSurface: '#FFE4E9',
    info: '#2563EB',
    infoSurface: '#DFEAFE',
    skeleton: '#ECE9F4',
  },
  dark: {
    primary: '#9784FF',
    primaryMuted: '#2B2452',
    onPrimary: '#FFFFFF',
    accent: '#FF7AA8',
    accentSurface: '#43182B',
    background: '#0E0B1A',
    surface: '#181428',
    surfaceAlt: '#221D37',
    text: '#F4F2FF',
    textSecondary: '#A39EBD',
    border: '#2A2541',
    success: '#4ADE80',
    successSurface: '#12321F',
    warning: '#FBBF24',
    warningSurface: '#3A2A0A',
    danger: '#FB7185',
    dangerSurface: '#3F1420',
    info: '#60A5FA',
    infoSurface: '#16254A',
    skeleton: '#2A2541',
  },
} as const;

/** Degradado de marca (violeta → rosa) para avatares, logotipos y elementos destacados. */
export const BrandGradient = {
  light: 'linear-gradient(135deg, #7C5CFF 0%, #F0508C 100%)',
  dark: 'linear-gradient(135deg, #6C4DF6 0%, #E0457F 100%)',
} as const;

/** Sombra suave de las superficies elevadas (tarjetas, listas). */
export const Elevation = {
  light: '0px 6px 20px rgba(40, 24, 110, 0.07)',
  dark: '0px 6px 20px rgba(0, 0, 0, 0.35)',
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
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

export const Typography = {
  display: { fontSize: 30, lineHeight: 36, fontWeight: '800', letterSpacing: -0.6 },
  title: { fontSize: 22, lineHeight: 28, fontWeight: '800', letterSpacing: -0.3 },
  heading: { fontSize: 17, lineHeight: 24, fontWeight: '700' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  caption: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', letterSpacing: 0.8 },
} as const;

export type TypographyVariant = keyof typeof Typography;

/** Ancho máximo del contenido para que se vea bien en tablets y pantallas plegables. */
export const MaxContentWidth = 640;

/** Espacio inferior reservado para que la barra de pestañas no tape el contenido. */
export const BottomTabInset = 96;

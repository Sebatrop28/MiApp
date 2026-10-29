import { Text, type TextProps } from 'react-native';

import { Typography, type ThemeColor, type TypographyVariant } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export interface ThemedTextProps extends TextProps {
  variant?: TypographyVariant;
  color?: ThemeColor;
}

/** Texto que aplica automáticamente la tipografía y el color del tema activo. */
export function ThemedText({ variant = 'body', color = 'text', style, ...rest }: ThemedTextProps) {
  const { colors } = useAppTheme();
  return <Text style={[Typography[variant], { color: colors[color] }, style]} {...rest} />;
}

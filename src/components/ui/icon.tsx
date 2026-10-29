import { SymbolView, type AndroidSymbol } from 'expo-symbols';
import type { StyleProp, ViewStyle } from 'react-native';

import type { ThemeColor } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export type IconName = AndroidSymbol;

export interface IconProps {
  /** Nombre de un icono de Material Symbols (https://fonts.google.com/icons). */
  name: IconName;
  size?: number;
  color?: ThemeColor;
  style?: StyleProp<ViewStyle>;
}

export function Icon({ name, size = 22, color = 'text', style }: IconProps) {
  const { colors } = useAppTheme();
  return (
    <SymbolView
      name={{ android: name, web: name }}
      size={size}
      tintColor={colors[color]}
      style={style}
      accessible={false}
      importantForAccessibility="no"
    />
  );
}

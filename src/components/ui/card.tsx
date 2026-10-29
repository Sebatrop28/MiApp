import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export interface CardProps extends PropsWithChildren {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/** Superficie elevada. Si recibe `onPress` se comporta como botón con efecto ripple. */
export function Card({ onPress, style, children, accessibilityLabel, accessibilityHint, testID }: CardProps) {
  const { colors } = useAppTheme();
  const baseStyle = [styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, style];

  if (!onPress) {
    return (
      <View style={baseStyle} testID={testID}>
        {children}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      android_ripple={{ color: colors.primaryMuted }}
      style={({ pressed }) => [baseStyle, pressed && styles.pressed]}
      testID={testID}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: Spacing.lg,
    overflow: 'hidden',
  },
  pressed: { opacity: 0.85 },
});

import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, type ThemeColor } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon, type IconName } from './icon';
import { ThemedText } from './themed-text';

export type ButtonVariant = 'primary' | 'secondary' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  testID?: string;
}

const VARIANT_COLORS: Record<ButtonVariant, { background: ThemeColor; foreground: ThemeColor }> = {
  primary: { background: 'primary', foreground: 'onPrimary' },
  secondary: { background: 'primaryMuted', foreground: 'primary' },
  danger: { background: 'dangerSurface', foreground: 'danger' },
};

export function Button({ label, onPress, variant = 'primary', icon, loading = false, disabled = false, testID }: ButtonProps) {
  const { colors, gradient } = useAppTheme();
  const palette = VARIANT_COLORS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      android_ripple={{ color: colors.surfaceAlt }}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: colors[palette.background] },
        variant === 'primary' && { backgroundImage: gradient, boxShadow: `0px 6px 16px ${colors.primary}40` },
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}>
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator size="small" color={colors[palette.foreground]} />
        ) : icon ? (
          <Icon name={icon} size={20} color={palette.foreground} />
        ) : null}
        <ThemedText variant="bodyStrong" color={palette.foreground}>
          {label}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 50,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.xl,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
  },
  pressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.5 },
});

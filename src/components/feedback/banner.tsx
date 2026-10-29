import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Icon } from '../ui/icon';
import { ThemedText } from '../ui/themed-text';

export type BannerTone = 'error' | 'info';

export interface BannerProps {
  message: string;
  tone?: BannerTone;
  onDismiss?: () => void;
  testID?: string;
}

/** Aviso en línea, no bloqueante, para errores recuperables o información. */
export function Banner({ message, tone = 'info', onDismiss, testID = 'banner' }: BannerProps) {
  const { colors } = useAppTheme();
  const isError = tone === 'error';

  return (
    <View
      accessibilityRole={isError ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      testID={testID}
      style={[styles.banner, { backgroundColor: isError ? colors.dangerSurface : colors.infoSurface }]}>
      <Icon name={isError ? 'error' : 'info'} size={20} color={isError ? 'danger' : 'info'} />
      <ThemedText variant="caption" style={styles.message}>
        {message}
      </ThemedText>
      {onDismiss ? (
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="Cerrar aviso" hitSlop={12}>
          <Icon name="close" size={20} color="textSecondary" />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  message: { flex: 1 },
});

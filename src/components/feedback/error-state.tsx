import { StyleSheet, View } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { Button } from '../ui/button';
import { Icon, type IconName } from '../ui/icon';
import { ThemedText } from '../ui/themed-text';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: IconName;
  testID?: string;
}

/** Mensaje de error a pantalla o sección completa, con acción de reintento opcional. */
export function ErrorState({
  title = 'Algo salió mal',
  message,
  onRetry,
  retryLabel = 'Reintentar',
  icon = 'cloud_off',
  testID = 'error-state',
}: ErrorStateProps) {
  const { colors } = useAppTheme();
  return (
    <View
      style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}
      accessibilityRole="alert"
      testID={testID}>
      <View style={[styles.iconWrap, { backgroundColor: colors.dangerSurface }]}>
        <Icon name={icon} size={28} color="danger" />
      </View>
      <ThemedText variant="heading" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText color="textSecondary" style={styles.center}>
        {message}
      </ThemedText>
      {onRetry ? <Button label={retryLabel} icon="refresh" onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.xl,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { textAlign: 'center' },
});

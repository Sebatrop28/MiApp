import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { ThemedText } from '../ui/themed-text';

export interface LoadingStateProps {
  message?: string;
  testID?: string;
}

/** Indicador de carga centrado con mensaje accesible. */
export function LoadingState({ message = 'Cargando…', testID = 'loading-state' }: LoadingStateProps) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.container} accessibilityRole="progressbar" accessibilityLabel={message} testID={testID}>
      <ActivityIndicator size="large" color={colors.primary} />
      <ThemedText color="textSecondary">{message}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.md,
    paddingVertical: Spacing.xxl,
  },
});

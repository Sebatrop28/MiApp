import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ThemedText } from './themed-text';

export interface SectionProps extends PropsWithChildren {
  title: string;
}

/** Agrupa contenido bajo un encabezado en mayúsculas. */
export function Section({ title, children }: SectionProps) {
  return (
    <View style={styles.section}>
      <ThemedText variant="label" color="textSecondary" accessibilityRole="header" style={styles.title}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.sm },
  title: { paddingHorizontal: Spacing.xs },
});

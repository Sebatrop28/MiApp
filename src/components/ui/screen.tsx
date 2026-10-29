import type { PropsWithChildren, ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

import { ThemedText } from './themed-text';

export interface ScreenProps extends PropsWithChildren {
  title?: string;
  subtitle?: string;
  /** Contenido opcional a la derecha del título. */
  headerRight?: ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  testID?: string;
}

/**
 * Contenedor base de cada pantalla: respeta las áreas seguras, limita el ancho
 * en pantallas grandes, deja espacio para la barra de pestañas y admite
 * «deslizar para actualizar».
 */
export function Screen({ title, subtitle, headerRight, refreshing, onRefresh, children, testID }: ScreenProps) {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <ScrollView
        testID={testID}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing ?? false}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
              progressBackgroundColor={colors.surface}
            />
          ) : undefined
        }>
        <View style={styles.content}>
          {title ? (
            <View style={styles.header}>
              <View style={styles.headerText}>
                <ThemedText variant="display" accessibilityRole="header">
                  {title}
                </ThemedText>
                {subtitle ? <ThemedText color="textSecondary">{subtitle}</ThemedText> : null}
              </View>
              {headerRight}
            </View>
          ) : null}
          {children}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: BottomTabInset,
  },
  content: {
    width: '100%',
    maxWidth: MaxContentWidth,
    gap: Spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: { flex: 1, gap: Spacing.xs },
});

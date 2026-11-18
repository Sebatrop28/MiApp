import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/ui/icon';
import { ThemedText } from '@/components/ui/themed-text';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export interface AuthLayoutProps extends PropsWithChildren {
  title: string;
  subtitle: string;
  testID?: string;
}

/** Contenedor común de las pantallas de inicio de sesión y registro. */
export function AuthLayout({ title, subtitle, testID, children }: AuthLayoutProps) {
  const { colors } = useAppTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} testID={testID}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={[styles.logo, { backgroundColor: colors.primaryMuted }]}>
                <Icon name="lock" size={32} color="primary" />
              </View>
              <ThemedText variant="display">{title}</ThemedText>
              <ThemedText color="textSecondary">{subtitle}</ThemedText>
            </View>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.xl },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.lg },
  header: { gap: Spacing.sm, marginBottom: Spacing.md },
  logo: {
    width: 64,
    height: 64,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});

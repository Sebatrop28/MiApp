import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
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
  const { colors, gradient } = useAppTheme();
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.background }]} testID={testID}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={[styles.logo, { backgroundImage: gradient, boxShadow: `0px 10px 24px ${colors.primary}55` }]}>
                <Icon name="forum" size={34} color="onPrimary" />
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
    width: 72,
    height: 72,
    borderRadius: Radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});

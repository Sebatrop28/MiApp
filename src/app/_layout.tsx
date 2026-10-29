import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/feedback/error-state';
import { Colors, Spacing } from '@/constants/theme';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import { useAppTheme } from '@/hooks/use-theme';

// Mantiene la pantalla de presentación visible hasta cargar los ajustes guardados.
SplashScreen.preventAutoHideAsync().catch(() => {
  /* La pantalla de presentación ya estaba oculta (p. ej. en web o tras recarga). */
});

/** Captura errores no controlados de cualquier pantalla y ofrece reintentar. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <View style={styles.fatal}>
      <ErrorState
        title="La aplicación encontró un problema"
        message={error.message || 'Error desconocido.'}
        onRetry={retry}
        icon="report"
      />
    </View>
  );
}

function RootNavigator() {
  const { status } = useSettings();
  const { scheme, colors } = useAppTheme();

  useEffect(() => {
    if (status !== 'loading') {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  const navigationTheme = useMemo(() => {
    const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [scheme, colors]);

  if (status === 'loading') {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'No encontrada' }} />
      </Stack>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <RootNavigator />
      </SettingsProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fatal: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.light.background,
  },
});

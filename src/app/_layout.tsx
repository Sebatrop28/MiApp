import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ErrorState } from '@/components/feedback/error-state';
import { Colors, Spacing } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/context/auth-context';
import { ChatProvider } from '@/context/chat-context';
import { FriendsProvider } from '@/context/friends-context';
import { NotesProvider } from '@/context/notes-context';
import { SettingsProvider, useSettings } from '@/context/settings-context';
import { useAppTheme } from '@/hooks/use-theme';

// Mantiene la pantalla de presentación visible hasta cargar los ajustes y la sesión guardados.
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
  const { status: settingsStatus } = useSettings();
  const { status: authStatus, user } = useAuth();
  const { scheme, colors } = useAppTheme();
  const loading = settingsStatus === 'loading' || authStatus === 'loading';
  const signedIn = authStatus === 'signedIn';

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loading]);

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

  if (loading) {
    return null;
  }

  const navigator = (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={signedIn}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen
            name="note/[id]"
            options={{
              headerShown: true,
              title: 'Nota',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="chat/[uid]"
            options={{
              headerShown: true,
              title: 'Chat',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="add-friend"
            options={{
              headerShown: true,
              title: 'Añadir amigo',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
          <Stack.Screen
            name="updates"
            options={{
              headerShown: true,
              title: 'Actualizaciones',
              headerStyle: { backgroundColor: colors.surface },
              headerTintColor: colors.text,
            }}
          />
        </Stack.Protected>
        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" />
          <Stack.Screen name="sign-up" />
          <Stack.Screen name="forgot-password" />
        </Stack.Protected>
        <Stack.Screen name="+not-found" options={{ headerShown: true, title: 'No encontrada' }} />
      </Stack>
    </ThemeProvider>
  );

  // Notas, amigos y chats son por cuenta; `key` reinicia los proveedores al cambiar de usuario.
  return user ? (
    <NotesProvider key={user.uid} userId={user.uid}>
      <FriendsProvider key={user.uid} userId={user.uid} displayName={user.displayName}>
        <ChatProvider key={user.uid} userId={user.uid}>
          {navigator}
        </ChatProvider>
      </FriendsProvider>
    </NotesProvider>
  ) : (
    navigator
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
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

import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ErrorState } from '@/components/feedback/error-state';
import { Spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ErrorState
        title="Pantalla no encontrada"
        message="La ruta que intentas abrir no existe."
        icon="explore_off"
        retryLabel="Ir al inicio"
        onRetry={() => router.replace('/')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: Spacing.xl },
});

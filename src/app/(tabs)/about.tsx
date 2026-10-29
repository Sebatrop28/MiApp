import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Banner } from '@/components/feedback/banner';
import { ErrorState } from '@/components/feedback/error-state';
import { LoadingState } from '@/components/feedback/loading-state';
import { ListGroup } from '@/components/ui/list-group';
import { ListRow } from '@/components/ui/list-row';
import { Screen } from '@/components/ui/screen';
import { Section } from '@/components/ui/section';
import { ThemedText } from '@/components/ui/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useAsync } from '@/hooks/use-async';
import { getAppInfo, type InfoItem } from '@/services/app-info';
import { toErrorMessage } from '@/utils/errors';

const LINKS = [
  { title: 'Documentación de Expo', url: 'https://docs.expo.dev', icon: 'menu_book' },
  { title: 'Guía de EAS Build', url: 'https://docs.expo.dev/build/introduction/', icon: 'build' },
] as const;

export default function AboutScreen() {
  const info = useAsync(getAppInfo);
  const [linkError, setLinkError] = useState<string | null>(null);

  const openLink = async (url: string) => {
    setLinkError(null);
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      setLinkError(`No se pudo abrir el enlace: ${toErrorMessage(e)}`);
    }
  };

  return (
    <Screen
      title="Información"
      subtitle="Detalles de la aplicación"
      refreshing={info.status === 'refreshing'}
      onRefresh={info.refresh}
      testID="about-screen">
      {info.status === 'loading' ? <LoadingState message="Obteniendo información…" /> : null}

      {info.status === 'error' ? (
        <ErrorState title="No se pudo obtener la información" message={info.error ?? ''} onRetry={info.reload} />
      ) : null}

      {info.data && info.status !== 'error' && info.status !== 'loading' ? (
        <>
          <View style={styles.brand}>
            <Image source={require('@/assets/images/icon.png')} style={styles.logo} accessibilityLabel="Logotipo" />
            <ThemedText variant="title">{info.data.appName}</ThemedText>
            <ThemedText color="textSecondary">Versión {info.data.version}</ThemedText>
          </View>

          <InfoSection title="Aplicación" items={info.data.application} />
          <InfoSection title="Dispositivo" items={info.data.device} />
          <InfoSection title="Tecnologías" items={info.data.technology} />

          <Section title="Enlaces">
            {linkError ? <Banner tone="error" message={linkError} onDismiss={() => setLinkError(null)} /> : null}
            <ListGroup>
              {LINKS.map((link) => (
                <ListRow
                  key={link.url}
                  icon={link.icon}
                  title={link.title}
                  onPress={() => void openLink(link.url)}
                  trailing={null}
                  showChevron
                />
              ))}
            </ListGroup>
          </Section>

          <ThemedText variant="caption" color="textSecondary" style={styles.footer}>
            Hecho con Expo y React Native.
          </ThemedText>
        </>
      ) : null}
    </Screen>
  );
}

function InfoSection({ title, items }: { title: string; items: InfoItem[] }) {
  return (
    <Section title={title}>
      <ListGroup>
        {items.map((item) => (
          <ListRow
            key={item.label}
            title={item.label}
            trailing={
              <ThemedText color="textSecondary" style={styles.value} numberOfLines={2}>
                {item.value}
              </ThemedText>
            }
          />
        ))}
      </ListGroup>
    </Section>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: Spacing.xs },
  logo: { width: 88, height: 88, borderRadius: Radius.xl, marginBottom: Spacing.sm },
  value: { maxWidth: '60%', textAlign: 'right' },
  footer: { textAlign: 'center' },
});

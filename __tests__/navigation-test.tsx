import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import AboutScreen from '@/app/(tabs)/about';
import HomeScreen from '@/app/(tabs)/index';
import SettingsScreen from '@/app/(tabs)/settings';
import RootLayout from '@/app/_layout';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/services/settings-storage';

jest.mock('@/services/app-info', () => ({
  getAppInfo: jest.fn().mockResolvedValue({
    appName: 'MiApp',
    version: '1.0.0',
    application: [{ label: 'Versión', value: '1.0.0' }],
    device: [{ label: 'Modelo', value: 'Pixel' }],
    technology: [{ label: 'Expo SDK', value: '58.0.0' }],
  }),
}));

jest.mock('@/services/content', () => {
  const { NetworkError } = jest.requireActual('@/utils/errors');
  return {
    fetchHighlights: jest.fn(async ({ simulateError }: { simulateError?: boolean } = {}) => {
      if (simulateError) throw new NetworkError();
      return [{ id: 'demo', title: 'Novedad de prueba', description: 'Descripción', icon: 'info' }];
    }),
  };
});

// Se usa un Stack en lugar de NativeTabs para que las pantallas se rendericen en el entorno de pruebas.
const routes = {
  _layout: RootLayout,
  '(tabs)/_layout': () => {
    const { Stack } = jest.requireActual('expo-router');
    return <Stack screenOptions={{ headerShown: false }} />;
  },
  '(tabs)/index': HomeScreen,
  '(tabs)/settings': SettingsScreen,
  '(tabs)/about': AboutScreen,
  '+not-found': () => null,
};

describe('navegación', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('muestra Inicio con su contenido cargado', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Novedad de prueba')).toBeTruthy();
    expect(screen).toHavePathname('/');
  });

  it('navega de Inicio a Ajustes y a Información', async () => {
    await renderRouter(routes, { initialUrl: '/' });

    await fireEvent.press(await screen.findByRole('button', { name: 'Ajustes' }));
    await waitFor(() => expect(screen).toHavePathname('/settings'));
    expect(await screen.findByText('Personaliza tu experiencia')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Información de la app' }));
    await waitFor(() => expect(screen).toHavePathname('/about'));
    expect(await screen.findByText('Versión 1.0.0')).toBeTruthy();
  });

  it('muestra un error recuperable en Inicio cuando la carga falla', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({ ...DEFAULT_SETTINGS, simulateNetworkErrors: true }),
    );
    await renderRouter(routes, { initialUrl: '/' });

    expect(await screen.findByText('No se pudo cargar el contenido')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeTruthy();
  });
});

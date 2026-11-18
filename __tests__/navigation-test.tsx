import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import AboutScreen from '@/app/(tabs)/about';
import HomeScreen from '@/app/(tabs)/index';
import NotesScreen from '@/app/(tabs)/notes';
import SettingsScreen from '@/app/(tabs)/settings';
import RootLayout from '@/app/_layout';
import NoteScreen from '@/app/note/[id]';
import { NOTES_STORAGE_KEY } from '@/services/notes-storage';
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
  '(tabs)/notes': NotesScreen,
  'note/[id]': NoteScreen,
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

  it('crea una nota, la guarda y la muestra en la lista', async () => {
    await renderRouter(routes, { initialUrl: '/notes' });
    expect(await screen.findByText('Aún no tienes notas')).toBeTruthy();

    await fireEvent.press(screen.getByRole('button', { name: 'Nueva nota' }));
    await waitFor(() => expect(screen).toHavePathname(expect.stringMatching(/^\/note\//)));

    await fireEvent.changeText(await screen.findByTestId('note-input'), 'Lista de compras\nleche y pan');

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(NOTES_STORAGE_KEY)) ?? '[]');
      expect(stored).toHaveLength(1);
      expect(stored[0].text).toBe('Lista de compras\nleche y pan');
    });

    await act(() => router.back());
    await waitFor(() => expect(screen).toHavePathname('/notes'));
    expect(await screen.findByText('Lista de compras')).toBeTruthy();
    expect(screen.getByText('leche y pan')).toBeTruthy();
  });

  it('carga las notas guardadas al abrir la app', async () => {
    await AsyncStorage.setItem(
      NOTES_STORAGE_KEY,
      JSON.stringify([{ id: 'n1', text: 'Nota guardada\ncontenido', createdAt: 1, updatedAt: 1 }]),
    );
    await renderRouter(routes, { initialUrl: '/notes' });
    expect(await screen.findByText('Nota guardada')).toBeTruthy();
    expect(screen.getByText('1 nota guardada')).toBeTruthy();
  });
});

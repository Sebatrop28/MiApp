import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { act, fireEvent, renderRouter, screen, waitFor } from 'expo-router/testing-library';

import AboutScreen from '@/app/(tabs)/about';
import FriendsScreen from '@/app/(tabs)/friends';
import HomeScreen from '@/app/(tabs)/index';
import NotesScreen from '@/app/(tabs)/notes';
import SettingsScreen from '@/app/(tabs)/settings';
import RootLayout from '@/app/_layout';
import AddFriendScreen from '@/app/add-friend';
import ForgotPasswordScreen from '@/app/forgot-password';
import NoteScreen from '@/app/note/[id]';
import SignInScreen from '@/app/sign-in';
import SignUpScreen from '@/app/sign-up';
import UpdatesScreen from '@/app/updates';
import { notesStorageKey } from '@/services/notes-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/services/settings-storage';

jest.mock('@/services/auth', () => jest.requireActual('../test-utils/mock-auth'));
jest.mock('@/services/friends', () => jest.requireActual('../test-utils/mock-friends'));

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
const mockAuth = jest.requireMock<typeof import('../test-utils/mock-auth')>('@/services/auth');
const mockFriends = jest.requireMock<typeof import('../test-utils/mock-friends')>('@/services/friends');

const TEST_USER = { uid: 'u1', email: 'ana@ejemplo.com', displayName: 'Ana', emailVerified: true, provider: 'password' as const };

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
  '(tabs)/friends': FriendsScreen,
  'add-friend': AddFriendScreen,
  'note/[id]': NoteScreen,
  'sign-in': SignInScreen,
  'sign-up': SignUpScreen,
  'forgot-password': ForgotPasswordScreen,
  updates: UpdatesScreen,
  '+not-found': () => null,
};

describe('navegación', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockAuth.reset();
    mockFriends.reset();
    mockAuth.setUser(TEST_USER);
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
      const stored = JSON.parse((await AsyncStorage.getItem(notesStorageKey(TEST_USER.uid))) ?? '[]');
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
      notesStorageKey(TEST_USER.uid),
      JSON.stringify([{ id: 'n1', text: 'Nota guardada\ncontenido', createdAt: 1, updatedAt: 1 }]),
    );
    await renderRouter(routes, { initialUrl: '/notes' });
    expect(await screen.findByText('Nota guardada')).toBeTruthy();
    expect(screen.getByText('1 nota guardada')).toBeTruthy();
  });
});

describe('amigos', () => {
  const ana = { uid: TEST_USER.uid, username: 'ana', displayName: 'Ana' };
  const luis = { uid: 'u2', username: 'luis', displayName: 'Luis' };

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockAuth.reset();
    mockFriends.reset();
    mockAuth.setUser(TEST_USER);
  });

  it('pide elegir un nombre de usuario válido y único', async () => {
    mockFriends.addProfile({ uid: 'u3', username: 'ocupado', displayName: 'Otra' });
    await renderRouter(routes, { initialUrl: '/friends' });

    await fireEvent.press(await screen.findByTestId('button-save-username'));
    expect(await screen.findByText('Escribe un nombre de usuario.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-username'), 'Ocupado');
    await fireEvent.press(screen.getByTestId('button-save-username'));
    expect(await screen.findByText('Ese nombre de usuario ya está en uso. Prueba con otro.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-username'), '@Ana');
    await fireEvent.press(screen.getByTestId('button-save-username'));
    expect(await screen.findByText('Tu usuario: @ana')).toBeTruthy();
    expect(mockFriends.createProfile).toHaveBeenLastCalledWith(TEST_USER.uid, '@Ana', 'Ana');
  });

  it('busca a alguien por usuario y le envía una solicitud', async () => {
    mockFriends.addProfile(ana);
    mockFriends.addProfile(luis);
    await renderRouter(routes, { initialUrl: '/friends' });

    await fireEvent.press(await screen.findByTestId('button-add-friend'));
    await waitFor(() => expect(screen).toHavePathname('/add-friend'));

    await fireEvent.changeText(screen.getByTestId('input-friend-username'), 'nadie');
    await fireEvent.press(screen.getByTestId('button-search-friend'));
    expect(await screen.findByText('No existe ningún usuario @nadie.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-friend-username'), '@Luis');
    await fireEvent.press(screen.getByTestId('button-search-friend'));
    await fireEvent.press(await screen.findByTestId('button-send-request'));
    expect(await screen.findByText(/Solicitud enviada a @luis/)).toBeTruthy();

    await act(() => router.back());
    expect(await screen.findByText('@luis · pendiente')).toBeTruthy();
  });

  it('acepta una solicitud recibida y muestra al nuevo amigo', async () => {
    mockFriends.addProfile(ana);
    mockFriends.addProfile(luis);
    mockFriends.addRequest(luis, ana);
    await renderRouter(routes, { initialUrl: '/friends' });

    expect(await screen.findByText('@luis quiere ser tu amigo')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('accept-luis'));

    expect(await screen.findByTestId('friend-luis')).toBeTruthy();
    expect(screen.queryByText('@luis quiere ser tu amigo')).toBeNull();
    expect(mockFriends.friendUids(ana.uid)).toEqual(['u2']);
  });

  it('si la otra persona ya te había invitado, enviar la solicitud la acepta', async () => {
    mockFriends.addProfile(ana);
    mockFriends.addProfile(luis);
    mockFriends.addRequest(luis, ana);
    await renderRouter(routes, { initialUrl: '/add-friend' });

    await fireEvent.changeText(await screen.findByTestId('input-friend-username'), 'luis');
    await fireEvent.press(screen.getByTestId('button-search-friend'));
    await fireEvent.press(await screen.findByTestId('button-send-request'));

    expect(await screen.findByText(/ahora son amigos/)).toBeTruthy();
    expect(mockFriends.sendFriendRequest).not.toHaveBeenCalled();
    expect(mockFriends.friendUids(ana.uid)).toEqual(['u2']);
  });
});

describe('cuentas', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockAuth.reset();
  });

  it('pide iniciar sesión antes de entrar a la app', async () => {
    await renderRouter(routes, { initialUrl: '/notes' });
    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
    expect(screen.queryByText('Aún no tienes notas')).toBeNull();
  });

  it('crea una cuenta con correo y entra a Inicio', async () => {
    await renderRouter(routes, { initialUrl: '/' });
    await fireEvent.press(await screen.findByTestId('link-sign-up'));
    await waitFor(() => expect(screen).toHavePathname('/sign-up'));

    await fireEvent.press(screen.getByTestId('button-sign-up'));
    expect(screen.getByText('Escribe tu nombre.')).toBeTruthy();
    expect(screen.getByText('La contraseña debe tener al menos 6 caracteres.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-name'), 'Luis');
    await fireEvent.changeText(screen.getByTestId('input-email'), 'luis@ejemplo.com');
    await fireEvent.changeText(screen.getByTestId('input-password'), 'secreto1');
    await fireEvent.changeText(screen.getByTestId('input-confirm'), 'secreto1');
    await fireEvent.press(screen.getByTestId('button-sign-up'));

    expect(await screen.findByText('Novedad de prueba')).toBeTruthy();
    expect(mockAuth.signUpWithEmail).toHaveBeenCalledWith('Luis', 'luis@ejemplo.com', 'secreto1');

    await act(() => router.navigate('/settings'));
    expect(await screen.findByText('Luis')).toBeTruthy();
  });

  it('muestra el error si la contraseña es incorrecta y entra con la correcta', async () => {
    mockAuth.addAccount('ana@ejemplo.com', 'secreto1', TEST_USER);
    await renderRouter(routes, { initialUrl: '/' });

    await fireEvent.changeText(await screen.findByTestId('input-email'), 'ana@ejemplo.com');
    await fireEvent.changeText(screen.getByTestId('input-password'), 'mala');
    await fireEvent.press(screen.getByTestId('button-sign-in'));
    expect(await screen.findByText('Correo o contraseña incorrectos.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-password'), 'secreto1');
    await fireEvent.press(screen.getByTestId('button-sign-in'));
    expect(await screen.findByText('Novedad de prueba')).toBeTruthy();
  });

  it('cada cuenta ve solo sus notas', async () => {
    await AsyncStorage.setItem(
      notesStorageKey('otra'),
      JSON.stringify([{ id: 'n1', text: 'Nota de otra cuenta', createdAt: 1, updatedAt: 1 }]),
    );
    mockAuth.setUser(TEST_USER);
    await renderRouter(routes, { initialUrl: '/notes' });
    expect(await screen.findByText('Aún no tienes notas')).toBeTruthy();
  });

  it('cierra sesión y vuelve a la pantalla de inicio de sesión', async () => {
    mockAuth.setUser(TEST_USER);
    await renderRouter(routes, { initialUrl: '/settings' });
    expect(await screen.findByText('Ana')).toBeTruthy();
    expect(screen.getByText('ana@ejemplo.com')).toBeTruthy();

    await act(() => mockAuth.signOut());
    expect(await screen.findByTestId('sign-in-screen')).toBeTruthy();
  });
});

describe('actualizaciones', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    mockAuth.reset();
    mockAuth.setUser(TEST_USER);
  });

  it('abre Actualizaciones desde Ajustes y guarda la preferencia automática', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
    await fireEvent.press(await screen.findByRole('button', { name: 'Actualizaciones' }));
    await waitFor(() => expect(screen).toHavePathname('/updates'));
    expect(await screen.findByTestId('updates-screen')).toBeTruthy();

    await fireEvent(screen.getByTestId('switch-auto-update'), 'valueChange', false);
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) ?? '{}');
      expect(stored.autoUpdate).toBe(false);
    });
  });
});

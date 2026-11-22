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
import NewPostScreen from '@/app/new-post';
import ChatScreen from '@/app/chat/[uid]';
import { decodeWire, encodeWire } from '@/services/chat-protocol';
import { chatStorageKey } from '@/services/chat-storage';
import { PeerSession } from '@/services/p2p';
import ForgotPasswordScreen from '@/app/forgot-password';
import NoteScreen from '@/app/note/[id]';
import SignInScreen from '@/app/sign-in';
import SignUpScreen from '@/app/sign-up';
import UpdatesScreen from '@/app/updates';
import { notesStorageKey } from '@/services/notes-storage';
import { DEFAULT_SETTINGS, SETTINGS_STORAGE_KEY } from '@/services/settings-storage';

jest.mock('@/services/auth', () => jest.requireActual('../test-utils/mock-auth'));
jest.mock('@/services/friends', () => jest.requireActual('../test-utils/mock-friends'));
jest.mock('@/services/firebase', () => ({ getFirebaseDb: () => ({}), getFirebaseAuth: () => ({}) }));
jest.mock('@/services/webrtc', () => ({
  getPeerConnectionConstructor: () => jest.requireActual('../test-utils/fake-webrtc').FakePeerConnection,
}));
jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(async () => ({
    canceled: false,
    assets: [{ uri: 'file:///galeria/foto.jpg', width: 4000, height: 3000 }],
  })),
}));
jest.mock('@/services/chat-media', () => ({
  imagesSupported: true,
  MAX_IMAGE_BYTES: 3 * 1024 * 1024,
  prepareImage: jest.fn(async (_u: string, _f: string, id: string) => ({ uri: `file:///chat/${id}.jpg`, width: 1280, height: 960 })),
  readImageBase64: jest.fn(async () => 'QUJD'.repeat(5000)),
  saveReceivedImage: jest.fn(async (_u: string, _f: string, id: string) => `file:///chat/recibida-${id}.jpg`),
}));
jest.mock('@/services/chat-relay', () => ({
  createFirestoreRelay: () => ({
    publish: jest.fn(async () => {}),
    subscribeIncoming: () => () => {},
    subscribeOutgoing: () => () => {},
    remove: jest.fn(async () => {}),
    getPublicKey: jest.fn(async () => null),
    setPublicKey: jest.fn(async () => {}),
  }),
}));
jest.mock('@/services/chat-key-store', () => ({ loadSecretKey: async () => null, saveSecretKey: async () => {} }));
jest.mock('@/services/chat-signaling', () => {
  const memory = jest.requireActual('../test-utils/fake-webrtc').createMemorySignaling();
  return { createFirestoreSignaling: () => memory.signaling, memory };
});

jest.mock('@/services/app-info', () => ({
  getAppInfo: jest.fn().mockResolvedValue({
    appName: 'MiApp',
    version: '1.0.0',
    application: [{ label: 'Versión', value: '1.0.0' }],
    device: [{ label: 'Modelo', value: 'Pixel' }],
    technology: [{ label: 'Expo SDK', value: '58.0.0' }],
  }),
}));

jest.mock('@/services/posts', () => jest.requireActual('../test-utils/mock-posts'));
jest.mock('@/services/post-media', () => ({
  preparePostImage: jest.fn(async () => ({ uri: 'file:///foto.jpg', base64: 'QUJD', width: 4, height: 3 })),
}));

// Se usa un Stack en lugar de NativeTabs para que las pantallas se rendericen en el entorno de pruebas.
const mockAuth = jest.requireMock<typeof import('../test-utils/mock-auth')>('@/services/auth');
const mockFriends = jest.requireMock<typeof import('../test-utils/mock-friends')>('@/services/friends');
const mockPosts = jest.requireMock<typeof import('../test-utils/mock-posts')>('@/services/posts');
const { memory: mockSignaling } = jest.requireMock<{ memory: ReturnType<typeof import('../test-utils/fake-webrtc').createMemorySignaling> }>(
  '@/services/chat-signaling',
);

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
  'new-post': NewPostScreen,
  'chat/[uid]': ChatScreen,
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
    mockPosts.reset();
    mockAuth.setUser(TEST_USER);
  });

  it('muestra en Inicio las publicaciones de todos y permite dar me gusta', async () => {
    mockPosts.addPost({
      id: 'x1',
      author: { uid: 'u9', username: 'luis', displayName: 'Luis' },
      text: 'Hola a todos',
      link: 'https://ejemplo.com/apuntes/Tema%201.pdf',
      image: null,
      likes: [],
      createdAt: Date.now(),
    });
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Hola a todos')).toBeTruthy();
    expect(screen.getByText('Tema 1.pdf')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Eliminar publicación' })).toBeNull();
    expect(await screen.findByText('Para publicar, primero elige tu nombre de usuario en Amigos.')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('like-x1'));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Quitar me gusta' })).toBeTruthy());
    expect(mockPosts.setLiked).toHaveBeenLastCalledWith('x1', TEST_USER.uid, true);
  });

  it('publica un mensaje con foto y enlace desde Inicio', async () => {
    mockFriends.addProfile({ uid: TEST_USER.uid, username: 'ana', displayName: 'Ana' });
    await renderRouter(routes, { initialUrl: '/' });
    expect(await screen.findByText('Todavía no hay publicaciones. ¡Sé la primera persona en compartir algo!')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('button-new-post'));
    await waitFor(() => expect(screen).toHavePathname('/new-post'));
    await fireEvent.press(await screen.findByTestId('button-publish'));
    expect(await screen.findByText('Escribe algo, añade una foto o un enlace.')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('input-post-text'), 'Mi primera publicación');
    await fireEvent.changeText(screen.getByTestId('input-post-link'), 'drive.google.com/file/d/abc/view');
    await fireEvent.press(screen.getByTestId('button-post-image'));
    expect(await screen.findByRole('button', { name: 'Quitar foto' })).toBeTruthy();
    await fireEvent.press(screen.getByTestId('button-publish'));

    await waitFor(() => expect(screen).toHavePathname('/'));
    expect(await screen.findByText('Mi primera publicación')).toBeTruthy();
    expect(await screen.findByTestId('post-image-p1')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Eliminar publicación' })).toBeTruthy();
    expect(mockPosts.createPost).toHaveBeenLastCalledWith(
      { uid: TEST_USER.uid, username: 'ana', displayName: 'Ana' },
      { text: 'Mi primera publicación', link: 'drive.google.com/file/d/abc/view', image: { base64: 'QUJD', width: 4, height: 3 } },
    );
  });

  it('navega de Ajustes a Información', async () => {
    await renderRouter(routes, { initialUrl: '/settings' });
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

    expect(await screen.findByText('No se pudieron cargar las publicaciones')).toBeTruthy();
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

describe('chat', () => {
  const ana = { uid: TEST_USER.uid, username: 'ana', displayName: 'Ana' };
  const luis = { uid: 'u2', username: 'luis', displayName: 'Luis' };

  beforeEach(async () => {
    await AsyncStorage.clear();
    mockAuth.reset();
    mockFriends.reset();
    mockSignaling.reset();
    mockAuth.setUser(TEST_USER);
    mockFriends.addProfile(ana);
    mockFriends.addProfile(luis);
    mockFriends.addRequest(luis, ana);
    await mockFriends.acceptFriendRequest({ id: 'u2_u1', from: luis, to: ana, createdAt: 0 });
  });

  /** Simula el teléfono de Luis con la app abierta: responde la llamada y confirma lo que recibe. */
  function luisPhone() {
    const { FakePeerConnection } = jest.requireActual('../test-utils/fake-webrtc');
    const received: string[] = [];
    const { ImageAssembler } = jest.requireActual('@/services/chat-protocol');
    const images = new ImageAssembler();
    let session: PeerSession | null = null;
    const stop = mockSignaling.signaling.subscribeToIncoming(luis.uid, (calls) => {
      const call = calls[0];
      if (!call || session) return;
      const s: PeerSession = new PeerSession(
        { PeerConnection: FakePeerConnection, iceServers: [], signaling: mockSignaling.signaling },
        {
          onOpen: () => {},
          onMessage: (data) => {
            const wire = decodeWire(data);
            if (wire?.t === 'msg') {
              received.push(wire.text);
              s.send(encodeWire({ t: 'ack', ids: [wire.id] }));
            } else if (wire?.t === 'img') {
              images.start(wire);
            } else if (wire?.t === 'chunk') {
              const done = images.add(wire);
              if (done) {
                received.push(`imagen:${done.base64.length}`);
                s.send(encodeWire({ t: 'ack', ids: [done.header.id] }));
              }
            }
          },
          onClose: () => {},
        },
      );
      session = s;
      void s.answer(call);
    }, () => {});
    return {
      received,
      send: (text: string) => session?.send(encodeWire({ t: 'msg', id: `l-${text}`, text, sentAt: Date.now() })),
      sendImage: () => {
        session?.send(encodeWire({ t: 'img', id: 'l-img', sentAt: Date.now(), width: 300, height: 200, chunks: 2 }));
        session?.send(encodeWire({ t: 'chunk', id: 'l-img', i: 1, data: 'REVG' }));
        session?.send(encodeWire({ t: 'chunk', id: 'l-img', i: 0, data: 'QUJD' }));
      },
      stop: () => {
        stop();
        session?.close();
      },
    };
  }

  it('abre el chat desde Amigos y envía y recibe mensajes directo', async () => {
    const phone = luisPhone();
    await renderRouter(routes, { initialUrl: '/friends' });
    await fireEvent.press(await screen.findByTestId('friend-luis'));
    await waitFor(() => expect(screen).toHavePathname('/chat/u2'));

    expect(await screen.findByText('Conectado: los mensajes van directo a su teléfono')).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Hola Luis');
    await fireEvent.press(screen.getByTestId('chat-send'));
    await waitFor(() => expect(phone.received).toEqual(['Hola Luis']));
    expect(await screen.findByLabelText('Entregado')).toBeTruthy();

    await act(async () => {
      phone.send('Hola Ana');
    });
    expect(await screen.findByText('Hola Ana')).toBeTruthy();

    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(chatStorageKey(TEST_USER.uid, luis.uid))) ?? '[]');
      expect(stored.map((m: { text: string; status: string }) => [m.text, m.status])).toEqual([
        ['Hola Luis', 'delivered'],
        ['Hola Ana', 'delivered'],
      ]);
    });
    phone.stop();
  });

  it('envía y recibe imágenes por trozos y las guarda solo en el teléfono', async () => {
    const phone = luisPhone();
    const media = jest.requireMock<typeof import('@/services/chat-media')>('@/services/chat-media');
    await renderRouter(routes, { initialUrl: '/chat/u2' });
    expect(await screen.findByText('Conectado: los mensajes van directo a su teléfono')).toBeTruthy();

    await fireEvent.press(screen.getByTestId('chat-attach-image'));
    await waitFor(() => expect(phone.received).toEqual(['imagen:20000']));
    expect(media.prepareImage).toHaveBeenCalledWith(TEST_USER.uid, luis.uid, expect.any(String), {
      uri: 'file:///galeria/foto.jpg',
      width: 4000,
      height: 3000,
    });
    expect(await screen.findByLabelText('Entregado')).toBeTruthy();

    await act(async () => {
      phone.sendImage();
    });
    expect(await screen.findByTestId('image-l-img')).toBeTruthy();
    expect(media.saveReceivedImage).toHaveBeenCalledWith(TEST_USER.uid, luis.uid, 'l-img', 'QUJDREVG');
    phone.stop();
  });

  it('guarda el mensaje como pendiente si el amigo no está conectado', async () => {
    await renderRouter(routes, { initialUrl: '/chat/u2' });
    expect(await screen.findByText(/Conectando… si tu amigo no tiene la app abierta/)).toBeTruthy();

    await fireEvent.changeText(screen.getByTestId('chat-input'), 'Te escribo luego');
    await fireEvent.press(screen.getByTestId('chat-send'));
    expect(await screen.findByLabelText('Pendiente')).toBeTruthy();
    await waitFor(async () => {
      const stored = JSON.parse((await AsyncStorage.getItem(chatStorageKey(TEST_USER.uid, luis.uid))) ?? '[]');
      expect(stored[0]).toMatchObject({ text: 'Te escribo luego', status: 'pending' });
    });
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

    expect(await screen.findByTestId('home-screen')).toBeTruthy();
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
    expect(await screen.findByTestId('home-screen')).toBeTruthy();
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

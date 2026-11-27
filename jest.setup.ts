import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Las notificaciones usan módulos nativos; en pruebas no hacen nada.
jest.mock('@/services/notifications', () => ({
  notificationsSupported: false,
  setForegroundFilter: () => {},
  ensureChannels: async () => {},
  getPermission: async () => 'denied',
  requestPermission: async () => 'denied',
  getExpoPushToken: async () => null,
  presentLocal: async () => {},
  subscribeToTaps: () => () => {},
}));

// La fuente de iconos se carga de forma asíncrona; en pruebas se sustituye por un componente vacío.
jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

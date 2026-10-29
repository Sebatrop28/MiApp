import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// La fuente de iconos se carga de forma asíncrona; en pruebas se sustituye por un componente vacío.
jest.mock('expo-symbols', () => ({
  SymbolView: () => null,
}));

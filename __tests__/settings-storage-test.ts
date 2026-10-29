import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  DEFAULT_SETTINGS,
  SETTINGS_STORAGE_KEY,
  clearSettings,
  loadSettings,
  sanitizeSettings,
  saveSettings,
} from '@/services/settings-storage';

describe('settings-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('devuelve los valores por defecto si no hay nada guardado', async () => {
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('guarda y recupera los ajustes', async () => {
    const custom = { themeMode: 'dark' as const, notificationsEnabled: false, simulateNetworkErrors: true };
    await saveSettings(custom);
    await expect(loadSettings()).resolves.toEqual(custom);
  });

  it('ignora JSON corrupto', async () => {
    await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, '{no-es-json');
    await expect(loadSettings()).resolves.toEqual(DEFAULT_SETTINGS);
  });

  it('clearSettings elimina la clave', async () => {
    await saveSettings({ ...DEFAULT_SETTINGS, themeMode: 'light' });
    await clearSettings();
    await expect(AsyncStorage.getItem(SETTINGS_STORAGE_KEY)).resolves.toBeNull();
  });

  it('sanitizeSettings descarta valores inválidos', () => {
    expect(sanitizeSettings({ themeMode: 'azul', notificationsEnabled: 'sí', simulateNetworkErrors: true })).toEqual({
      ...DEFAULT_SETTINGS,
      simulateNetworkErrors: true,
    });
    expect(sanitizeSettings(null)).toEqual(DEFAULT_SETTINGS);
  });
});

import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import {
  DEFAULT_SETTINGS,
  clearSettings,
  loadSettings,
  saveSettings,
  type Settings,
} from '@/services/settings-storage';
import { toErrorMessage } from '@/utils/errors';

export type SettingsStatus = 'loading' | 'ready';

export interface SettingsContextValue {
  settings: Settings;
  status: SettingsStatus;
  /** Último error de lectura/escritura del almacenamiento, o `null`. */
  error: string | null;
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => Promise<void>;
  resetSettings: () => Promise<void>;
  dismissError: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

/**
 * Proveedor global de ajustes. Carga las preferencias guardadas al iniciar y
 * las persiste cada vez que cambian (actualización optimista).
 */
export function SettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [status, setStatus] = useState<SettingsStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const settingsRef = useRef(settings);

  useEffect(() => {
    let cancelled = false;
    loadSettings()
      .then((loaded) => {
        if (cancelled) return;
        settingsRef.current = loaded;
        setSettings(loaded);
      })
      .catch(() => {
        if (cancelled) return;
        setError('No se pudieron cargar tus ajustes. Se usarán los valores predeterminados.');
      })
      .finally(() => {
        if (!cancelled) setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateSetting = useCallback(async <K extends keyof Settings>(key: K, value: Settings[K]) => {
    const next = { ...settingsRef.current, [key]: value };
    settingsRef.current = next;
    setSettings(next);
    try {
      await saveSettings(next);
    } catch (e) {
      setError(`No se pudo guardar el cambio: ${toErrorMessage(e)}`);
    }
  }, []);

  const resetSettings = useCallback(async () => {
    settingsRef.current = { ...DEFAULT_SETTINGS };
    setSettings(settingsRef.current);
    try {
      await clearSettings();
    } catch (e) {
      setError(`No se pudieron restablecer los ajustes: ${toErrorMessage(e)}`);
    }
  }, []);

  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, status, error, updateSetting, resetSettings, dismissError }),
    [settings, status, error, updateSetting, resetSettings, dismissError],
  );

  return <SettingsContext value={value}>{children}</SettingsContext>;
}

export function useSettings(): SettingsContextValue {
  const context = use(SettingsContext);
  if (!context) {
    throw new Error('useSettings debe usarse dentro de <SettingsProvider>.');
  }
  return context;
}

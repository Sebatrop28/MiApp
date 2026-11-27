import { router } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/context/settings-context';
import * as notifications from '@/services/notifications';
import type { AppNotification, NotificationPermission } from '@/services/notifications.types';
import * as push from '@/services/push';

/** `remote`: el evento también llega por push con la app en segundo plano; `direct`: solo hay aviso local. */
export type NotifySource = 'direct' | 'remote';

export interface NotificationsContextValue {
  supported: boolean;
  permission: NotificationPermission;
  /** Pide permiso y activa los avisos. `false` si el usuario lo negó. */
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  /** Avisa con una notificación local si corresponde (ajuste activo, app en segundo plano, otro chat...). */
  /** `eventId` (id del mensaje o de la solicitud) evita avisar dos veces del mismo evento. */
  notifyLocal: (notification: AppNotification, source: NotifySource, eventId: string) => void;
  /** Avisa a otra cuenta con push (solo si tiene las notificaciones activadas). */
  sendPush: (toUid: string, notification: AppNotification) => void;
  /** Chat abierto en pantalla: sus mensajes no generan avisos. */
  setActiveChat: (uid: string | null) => void;
  /** Borra el token de este teléfono; se llama antes de cerrar sesión. */
  unregister: () => Promise<void>;
}

const noop = () => {};
/** Sin conexión Firestore no confirma el borrado: no se espera más que esto para cerrar sesión. */
const UNREGISTER_TIMEOUT_MS = 3000;
const NOOP_VALUE: NotificationsContextValue = {
  supported: false,
  permission: 'denied',
  enable: async () => false,
  disable: async () => {},
  notifyLocal: noop,
  sendPush: noop,
  setActiveChat: noop,
  unregister: async () => {},
};

// Fuera del proveedor (p. ej. en pruebas) no se envía ni se muestra nada.
const NotificationsContext = createContext<NotificationsContextValue>(NOOP_VALUE);

export interface NotificationsProviderProps extends PropsWithChildren {
  userId: string;
}

export function NotificationsProvider({ userId, children }: NotificationsProviderProps) {
  const { settings, status, updateSetting } = useSettings();
  const enabled = settings.notificationsEnabled && notifications.notificationsSupported;
  const [permission, setPermission] = useState<NotificationPermission>('undetermined');
  /** Token de este teléfono guardado en Firestore: los demás pueden avisarle con push. */
  const registeredToken = useRef<string | null>(null);
  const activeChat = useRef<string | null>(null);
  const shown = useRef(new Set<string>());
  // En refs para que `notifyLocal` sea estable: las sesiones de chat abiertas guardan el callback.
  const allowed = useRef(false);
  useEffect(() => {
    allowed.current = enabled && permission === 'granted';
  }, [enabled, permission]);

  useEffect(() => {
    // Con la app abierta solo se muestran los avisos locales (las push llegan por duplicado).
    notifications.setForegroundFilter((data) => data.local === true);
    return notifications.subscribeToTaps((url) => router.push(url as never));
  }, []);

  // Al volver a la app se sincroniza otra vez el token (p. ej. si se desactivó sin conexión).
  const [syncTick, setSyncTick] = useState(0);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') setSyncTick((tick) => tick + 1);
    });
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (status !== 'ready' || !notifications.notificationsSupported) return;
    let cancelled = false;
    (async () => {
      let current = await notifications.getPermission();
      if (enabled && current === 'undetermined') current = await notifications.requestPermission();
      if (cancelled) return;
      setPermission(current);
      if (enabled && current === 'granted') {
        const token = await notifications.getExpoPushToken();
        if (cancelled || !token) return;
        await push.savePushToken(userId, token);
        registeredToken.current = token;
      } else {
        // Sin conexión puede no obtenerse el token: se usa el que se registró en esta sesión.
        const token = registeredToken.current ?? (current === 'granted' ? await notifications.getExpoPushToken() : null);
        if (cancelled || !token) return;
        await push.removePushToken(userId, token);
        registeredToken.current = null;
      }
    })().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [enabled, status, userId, syncTick]);

  const enable = useCallback(async () => {
    const result = await notifications.requestPermission().catch(() => 'denied' as const);
    setPermission(result);
    if (result !== 'granted') return false;
    await updateSetting('notificationsEnabled', true);
    return true;
  }, [updateSetting]);

  const disable = useCallback(() => updateSetting('notificationsEnabled', false), [updateSetting]);

  const notifyLocal = useCallback<NotificationsContextValue['notifyLocal']>(
    (notification, source, eventId) => {
      if (!allowed.current) return;
      const key = `${notification.kind}:${eventId}`;
      if (shown.current.has(key)) return;
      const active = AppState.currentState === 'active';
      if (active && notification.kind === 'message' && notification.url === `/chat/${activeChat.current}`) return;
      // En segundo plano, lo que envía otra cuenta ya llega por push.
      if (!active && source === 'remote' && registeredToken.current) return;
      shown.current.add(key);
      void notifications.presentLocal(notification).catch(() => shown.current.delete(key));
    },
    [],
  );

  const sendPush = useCallback((toUid: string, notification: AppNotification) => {
    void push.sendPush(toUid, notification);
  }, []);

  const setActiveChat = useCallback((uid: string | null) => {
    activeChat.current = uid;
  }, []);

  const unregister = useCallback(async () => {
    const token = registeredToken.current;
    if (!token) return;
    registeredToken.current = null;
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, UNREGISTER_TIMEOUT_MS));
    await Promise.race([push.removePushToken(userId, token).catch(() => {}), timeout]);
  }, [userId]);

  const value = useMemo<NotificationsContextValue>(
    () => ({
      supported: notifications.notificationsSupported,
      permission,
      enable,
      disable,
      notifyLocal,
      sendPush,
      setActiveChat,
      unregister,
    }),
    [permission, enable, disable, notifyLocal, sendPush, setActiveChat, unregister],
  );

  return <NotificationsContext value={value}>{children}</NotificationsContext>;
}

export function useNotifications(): NotificationsContextValue {
  return use(NotificationsContext);
}

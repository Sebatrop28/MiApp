import { router } from 'expo-router';
import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { useSettings } from '@/context/settings-context';
import * as notifications from '@/services/notifications';
import type { AppNotification, NotificationPermission } from '@/services/notifications.types';
import * as push from '@/services/push';

/** De dónde viene el aviso: `direct` no genera push (llegó por P2P con la app abierta). */
export type NotifySource = 'direct' | 'remote';

export interface NotificationsContextValue {
  supported: boolean;
  permission: NotificationPermission;
  /** Pide permiso y activa los avisos. `false` si el usuario lo negó. */
  enable: () => Promise<boolean>;
  disable: () => Promise<void>;
  /** Avisa con una notificación local si corresponde (ajuste activo, app en segundo plano, otro chat...). */
  notifyLocal: (notification: AppNotification, source: NotifySource) => void;
  /** Avisa a otra cuenta con push (solo si tiene las notificaciones activadas). */
  sendPush: (toUid: string, notification: AppNotification) => void;
  /** Chat abierto en pantalla: sus mensajes no generan avisos. */
  setActiveChat: (uid: string | null) => void;
  /** Borra el token de este teléfono; se llama antes de cerrar sesión. */
  unregister: () => Promise<void>;
}

const noop = () => {};
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
  /** Hay token guardado: los demás pueden avisar a este teléfono con push. */
  const pushReady = useRef(false);
  const activeChat = useRef<string | null>(null);
  const shown = useRef(new Set<string>());

  useEffect(() => {
    // Con la app abierta solo se muestran los avisos locales (las push llegan por duplicado).
    notifications.setForegroundFilter((data) => data.local === true);
    return notifications.subscribeToTaps((url) => router.push(url as never));
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
        pushReady.current = true;
      } else {
        pushReady.current = false;
        if (!enabled) await push.removePushToken(userId);
      }
    })().catch(() => {
      pushReady.current = false;
    });
    return () => {
      cancelled = true;
    };
  }, [enabled, status, userId]);

  const enable = useCallback(async () => {
    const result = await notifications.requestPermission().catch(() => 'denied' as const);
    setPermission(result);
    if (result !== 'granted') return false;
    await updateSetting('notificationsEnabled', true);
    return true;
  }, [updateSetting]);

  const disable = useCallback(() => updateSetting('notificationsEnabled', false), [updateSetting]);

  const notifyLocal = useCallback<NotificationsContextValue['notifyLocal']>(
    (notification, source) => {
      if (!enabled || permission !== 'granted') return;
      const key = `${notification.tag ?? notification.url}:${notification.body}`;
      if (shown.current.has(key)) return;
      const active = AppState.currentState === 'active';
      if (active && notification.kind === 'message' && notification.url === `/chat/${activeChat.current}`) return;
      // En segundo plano, lo que envía otra cuenta ya llega por push.
      if (!active && source === 'remote' && pushReady.current) return;
      shown.current.add(key);
      void notifications.presentLocal(notification).catch(() => shown.current.delete(key));
    },
    [enabled, permission],
  );

  const sendPush = useCallback((toUid: string, notification: AppNotification) => {
    void push.sendPush(toUid, notification);
  }, []);

  const setActiveChat = useCallback((uid: string | null) => {
    activeChat.current = uid;
  }, []);

  const unregister = useCallback(async () => {
    pushReady.current = false;
    await push.removePushToken(userId).catch(() => {});
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

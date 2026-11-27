import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { Platform } from 'react-native';

import { NOTIFICATION_CHANNELS, type AppNotification, type NotificationPermission } from './notifications.types';

export const notificationsSupported = true;

/**
 * Decide si se muestra una notificación que llega con la app en primer plano.
 * Las push se ocultan: con la app abierta ya se avisa con notificaciones locales.
 */
export function setForegroundFilter(shouldShow: (data: Record<string, unknown>) => boolean): void {
  Notifications.setNotificationHandler({
    handleNotification: async (notification) => {
      const show = shouldShow(notification.request.content.data ?? {});
      return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
    },
  });
}

/** En Android 13+ el permiso solo se puede pedir después de crear un canal. */
export async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Promise.all(
    Object.values(NOTIFICATION_CHANNELS).map(({ id, name, description }) =>
      Notifications.setNotificationChannelAsync(id, {
        name,
        description,
        importance: AndroidImportance.HIGH,
        lightColor: '#6C4DF6',
      }),
    ),
  );
}

function toPermission(status: Notifications.NotificationPermissionsStatus): NotificationPermission {
  if (status.granted) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermission(): Promise<NotificationPermission> {
  return toPermission(await Notifications.getPermissionsAsync());
}

export async function requestPermission(): Promise<NotificationPermission> {
  await ensureChannels();
  return toPermission(await Notifications.requestPermissionsAsync());
}

/**
 * Token de Expo Push de este teléfono, o `null` si no se puede obtener
 * (sin conexión, o falta configurar Firebase Cloud Messaging en el APK).
 */
export async function getExpoPushToken(): Promise<string | null> {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  if (!projectId) return null;
  try {
    await ensureChannels();
    return (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  } catch {
    return null;
  }
}

export async function presentLocal(notification: AppNotification): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    identifier: notification.tag,
    content: {
      title: notification.title,
      body: notification.body,
      data: { url: notification.url, kind: notification.kind, local: true },
    },
    trigger: Platform.OS === 'android' ? { channelId: NOTIFICATION_CHANNELS[notification.kind].id } : null,
  });
}

/** Llama a `onOpen` con la ruta de cada notificación que el usuario toca, incluida la que abrió la app. */
export function subscribeToTaps(onOpen: (url: string) => void): () => void {
  const open = (response: Notifications.NotificationResponse | null) => {
    const url = response?.notification.request.content.data?.url;
    if (typeof url !== 'string' || !url.startsWith('/')) return;
    onOpen(url);
    Notifications.clearLastNotificationResponse();
  };
  open(Notifications.getLastNotificationResponse());
  const subscription = Notifications.addNotificationResponseReceivedListener(open);
  return () => subscription.remove();
}

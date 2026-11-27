import { deleteDoc, doc, getDoc, setDoc } from 'firebase/firestore';

import { getFirebaseDb } from './firebase';
import { NOTIFICATION_CHANNELS, type AppNotification } from './notifications.types';

/**
 * Token de Expo Push de cada cuenta, para avisar con la app cerrada.
 *
 * pushTokens/{uid}  { token, updatedAt }
 *
 * Solo lo pueden leer sus amigos y quien le envía una solicitud (ver `firestore.rules`).
 * Al desactivar las notificaciones o cerrar sesión se borra, así nadie puede avisarle.
 */
export const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';
const TOKEN_PATTERN = /^Expo(nent)?PushToken\[[A-Za-z0-9_-]{1,100}\]$/;

export const isExpoPushToken = (value: unknown): value is string => typeof value === 'string' && TOKEN_PATTERN.test(value);

export async function savePushToken(uid: string, token: string): Promise<void> {
  await setDoc(doc(getFirebaseDb(), 'pushTokens', uid), { token, updatedAt: Date.now() });
}

export async function removePushToken(uid: string): Promise<void> {
  await deleteDoc(doc(getFirebaseDb(), 'pushTokens', uid));
}

export async function getPushToken(uid: string): Promise<string | null> {
  const snapshot = await getDoc(doc(getFirebaseDb(), 'pushTokens', uid));
  const token: unknown = snapshot.data()?.token;
  return isExpoPushToken(token) ? token : null;
}

/** Mensaje para el servicio Expo Push. */
export function buildPushMessage(token: string, notification: AppNotification) {
  return {
    to: token,
    title: notification.title,
    body: notification.body,
    data: { url: notification.url, kind: notification.kind },
    channelId: NOTIFICATION_CHANNELS[notification.kind].id,
    priority: 'high' as const,
    sound: 'default',
    ...(notification.tag ? { tag: notification.tag } : {}),
  };
}

/**
 * Avisa a otra cuenta con una notificación push. Si no tiene token (no activó las
 * notificaciones) o falla la red, no hace nada: los avisos son opcionales.
 */
export async function sendPush(toUid: string, notification: AppNotification): Promise<boolean> {
  try {
    const token = await getPushToken(toUid);
    if (!token) return false;
    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify(buildPushMessage(token, notification)),
    });
    return response.ok;
  } catch {
    return false;
  }
}

import type { AppNotification, NotificationPermission } from './notifications.types';

/** En la web no hay notificaciones: el interruptor de Ajustes queda deshabilitado. */
export const notificationsSupported = false;

export function setForegroundFilter(_shouldShow: (data: Record<string, unknown>) => boolean): void {}

export async function ensureChannels(): Promise<void> {}

export async function getPermission(): Promise<NotificationPermission> {
  return 'denied';
}

export async function requestPermission(): Promise<NotificationPermission> {
  return 'denied';
}

export async function getExpoPushToken(): Promise<string | null> {
  return null;
}

export async function presentLocal(_notification: AppNotification): Promise<void> {}

export function subscribeToTaps(_onOpen: (url: string) => void): () => void {
  return () => {};
}

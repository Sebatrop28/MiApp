export type NotificationKind = 'message' | 'friend';

export type NotificationPermission = 'granted' | 'denied' | 'undetermined';

/** Notificación de la app, local o enviada por push. */
export interface AppNotification {
  kind: NotificationKind;
  title: string;
  body: string;
  /** Ruta que se abre al tocarla (p. ej. `/chat/uid`). */
  url: string;
  /** Las notificaciones con la misma etiqueta se reemplazan (una por chat). */
  tag?: string;
}

/** Canales de Android: el usuario puede silenciar cada uno desde los ajustes del teléfono. */
export const NOTIFICATION_CHANNELS: Record<NotificationKind, { id: string; name: string; description: string }> = {
  message: { id: 'messages', name: 'Mensajes', description: 'Mensajes nuevos de tus amigos' },
  friend: { id: 'friends', name: 'Amigos', description: 'Solicitudes de amistad y solicitudes aceptadas' },
};

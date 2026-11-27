jest.mock('@/services/firebase', () => ({ getFirebaseDb: () => ({}) }));

import { buildPushMessage, isExpoPushToken } from '@/services/push';

describe('push', () => {
  it('reconoce solo tokens de Expo Push', () => {
    expect(isExpoPushToken('ExponentPushToken[abc_DEF-123]')).toBe(true);
    expect(isExpoPushToken('ExpoPushToken[xyz]')).toBe(true);
    expect(isExpoPushToken('ExponentPushToken[]')).toBe(false);
    expect(isExpoPushToken('https://ejemplo.com')).toBe(false);
    expect(isExpoPushToken(42)).toBe(false);
  });

  it('arma el mensaje con canal, ruta y etiqueta', () => {
    const message = buildPushMessage('ExponentPushToken[abc]', {
      kind: 'message',
      title: 'Ana',
      body: 'Te envió un mensaje',
      url: '/chat/u1',
      tag: 'chat-u1',
    });
    expect(message).toEqual({
      to: 'ExponentPushToken[abc]',
      title: 'Ana',
      body: 'Te envió un mensaje',
      data: { url: '/chat/u1', kind: 'message' },
      channelId: 'messages',
      priority: 'high',
      sound: 'default',
      tag: 'chat-u1',
    });
  });

  it('usa el canal de amigos y omite la etiqueta si no hay', () => {
    const message = buildPushMessage('ExponentPushToken[abc]', {
      kind: 'friend',
      title: 'Nueva solicitud de amistad',
      body: 'Ana quiere ser tu amigo',
      url: '/friends',
    });
    expect(message.channelId).toBe('friends');
    expect(message).not.toHaveProperty('tag');
  });
});

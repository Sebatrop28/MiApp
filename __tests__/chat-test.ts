import AsyncStorage from '@react-native-async-storage/async-storage';

import { decodeWire, encodeWire } from '@/services/chat-protocol';
import {
  addReceived,
  chatStorageKey,
  loadMessages,
  markDelivered,
  pendingMessages,
  saveMessages,
  type ChatMessage,
} from '@/services/chat-storage';

const msg = (id: string, from: string, sentAt: number, status: ChatMessage['status'] = 'pending'): ChatMessage => ({
  id,
  from,
  text: id,
  sentAt,
  status,
});

describe('protocolo del chat', () => {
  it('codifica y decodifica mensajes y confirmaciones', () => {
    const wire = { t: 'msg' as const, id: 'm1', text: 'hola', sentAt: 1 };
    expect(decodeWire(encodeWire(wire))).toEqual(wire);
    expect(decodeWire(encodeWire({ t: 'ack', ids: ['m1'] }))).toEqual({ t: 'ack', ids: ['m1'] });
  });

  it('ignora datos inválidos', () => {
    expect(decodeWire('no es json')).toBeNull();
    expect(decodeWire(JSON.stringify({ t: 'msg', id: 1 }))).toBeNull();
    expect(decodeWire(JSON.stringify({ t: 'msg', id: 'x', text: 'a'.repeat(5000), sentAt: 1 }))).toBeNull();
    expect(decodeWire(new ArrayBuffer(2))).toBeNull();
  });
});

describe('historial del chat', () => {
  beforeEach(() => AsyncStorage.clear());

  it('no duplica un mensaje recibido dos veces y ordena por fecha', () => {
    const first = addReceived([msg('b', 'u2', 2, 'delivered')], msg('a', 'u2', 1, 'delivered'));
    expect(first.map((m) => m.id)).toEqual(['a', 'b']);
    expect(addReceived(first, msg('a', 'u2', 1, 'delivered'))).toBe(first);
  });

  it('marca como entregados solo los mensajes propios pendientes', () => {
    const messages = [msg('a', 'me', 1), msg('b', 'me', 2), msg('a', 'u2', 3, 'delivered')];
    const next = markDelivered(messages, ['a'], 'me');
    expect(next.map((m) => m.status)).toEqual(['delivered', 'pending', 'delivered']);
    expect(pendingMessages(next, 'me').map((m) => m.id)).toEqual(['b']);
    expect(markDelivered(next, ['zzz'], 'me')).toBe(next);
  });

  it('guarda el historial por cuenta y por amigo, y descarta entradas inválidas', async () => {
    await saveMessages('me', 'u2', [msg('a', 'me', 1)]);
    expect(await loadMessages('me', 'u2')).toHaveLength(1);
    expect(await loadMessages('me', 'u3')).toEqual([]);
    expect(await loadMessages('otra', 'u2')).toEqual([]);

    await AsyncStorage.setItem(chatStorageKey('me', 'u4'), JSON.stringify([{ id: 1 }, msg('ok', 'u4', 1, 'delivered')]));
    expect((await loadMessages('me', 'u4')).map((m) => m.id)).toEqual(['ok']);
  });
});

import { decodeRelayPayload, getOrCreateKeyPair, isPublicKey, open, seal } from '@/services/chat-crypto';
import { assembleParts, relayDocId, splitSealed, type RelayPart } from '@/services/chat-relay';
import { markDelivered, markRelayed, relayedNoLongerWaiting, type ChatMessage } from '@/services/chat-storage';

const mockStore = new Map<string, string>();
jest.mock('@/services/chat-key-store', () => ({
  loadSecretKey: async (uid: string) => mockStore.get(uid) ?? null,
  saveSecretKey: async (uid: string, key: string) => void mockStore.set(uid, key),
}));
jest.mock('expo-crypto', () => ({
  getRandomBytes: (n: number) => new Uint8Array(require('node:crypto').randomBytes(n)),
}));

describe('cifrado del chat', () => {
  it('guarda la llave y cifra solo para el destinatario', async () => {
    const ana = await getOrCreateKeyPair('ana');
    const luis = await getOrCreateKeyPair('luis');
    const eva = await getOrCreateKeyPair('eva');
    expect(await getOrCreateKeyPair('ana')).toEqual(ana);
    expect(isPublicKey(ana.publicKey)).toBe(true);
    expect(ana.publicKey).toMatch(/^[A-Za-z0-9+/]{43}=$/);

    const sealed = seal('hola ñandú', luis.publicKey, ana);
    expect(sealed.data).not.toContain('hola');
    expect(sealed.nonce).toHaveLength(32);
    expect(open(sealed, ana.publicKey, luis)).toBe('hola ñandú');
    expect(open(sealed, ana.publicKey, eva)).toBeNull();
    expect(open(sealed, eva.publicKey, luis)).toBeNull();
    expect(open({ ...sealed, data: sealed.data.replace(/^./, (c) => (c === 'A' ? 'B' : 'A')) }, ana.publicKey, luis)).toBeNull();
  });

  it('valida el contenido descifrado', () => {
    expect(decodeRelayPayload(JSON.stringify({ t: 'msg', sentAt: 1, text: 'x' }))).toEqual({ t: 'msg', sentAt: 1, text: 'x' });
    expect(decodeRelayPayload(JSON.stringify({ t: 'img', sentAt: 1, width: 2, height: 3, data: 'QQ==' }))?.t).toBe('img');
    expect(decodeRelayPayload('no json')).toBeNull();
    expect(decodeRelayPayload(JSON.stringify({ t: 'msg', sentAt: 1, text: 'a'.repeat(5000) }))).toBeNull();
  });
});

describe('buzón cifrado', () => {
  const parts = (msgId: string, data: string, size: number): RelayPart[] =>
    splitSealed(data, size).map((d, part, all) => ({
      id: relayDocId('a', 'b', msgId, part),
      from: 'a',
      to: 'b',
      msgId,
      part,
      parts: all.length,
      nonce: 'n',
      data: d,
    }));

  it('une las partes y espera a que lleguen todas', () => {
    const all = parts('m1', 'abcdefghij', 3);
    expect(all).toHaveLength(4);
    expect(assembleParts(all.slice(0, 3))).toEqual([]);
    const [message] = assembleParts([...all].reverse());
    expect(message.sealed.data).toBe('abcdefghij');
    expect(message.ids).toHaveLength(4);
  });

  it('marca como entregado lo que ya no está en espera', () => {
    const m = (id: string, status: ChatMessage['status']): ChatMessage => ({ id, from: 'me', text: id, sentAt: 1, status });
    let messages = markRelayed([m('a', 'pending'), m('b', 'pending')], 'a', 'me');
    expect(messages.map((x) => x.status)).toEqual(['relayed', 'pending']);
    expect(relayedNoLongerWaiting(messages, new Set(['a']), 'me')).toEqual([]);
    const gone = relayedNoLongerWaiting(messages, new Set(), 'me');
    messages = markDelivered(messages, gone, 'me');
    expect(messages.map((x) => x.status)).toEqual(['delivered', 'pending']);
  });
});

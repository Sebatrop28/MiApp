import * as Crypto from 'expo-crypto';
import nacl from 'tweetnacl';
import naclUtil from 'tweetnacl-util';

import { MAX_MESSAGE_LENGTH } from './chat-protocol';
import { loadSecretKey, saveSecretKey } from './chat-key-store';

/**
 * Cifrado de extremo a extremo de los mensajes que esperan en Firebase (NaCl `box`:
 * X25519 + XSalsa20-Poly1305). Solo el teléfono del destinatario puede descifrarlos,
 * y el remitente queda autenticado por su llave.
 */
nacl.setPRNG((out, length) => {
  // `getRandomBytes` acepta como máximo 1024 bytes por llamada.
  for (let offset = 0; offset < length; offset += 1024) {
    out.set(Crypto.getRandomBytes(Math.min(1024, length - offset)), offset);
  }
});

export interface ChatKeyPair {
  /** base64; se publica en el perfil de Firestore. */
  publicKey: string;
  secretKey: Uint8Array;
}

export interface Sealed {
  nonce: string;
  data: string;
}

function fromSecretKey(secretKey: Uint8Array): ChatKeyPair {
  const pair = nacl.box.keyPair.fromSecretKey(secretKey);
  return { publicKey: naclUtil.encodeBase64(pair.publicKey), secretKey: pair.secretKey };
}

function decodeKey(value: string, length: number): Uint8Array | null {
  try {
    const bytes = naclUtil.decodeBase64(value);
    return bytes.length === length ? bytes : null;
  } catch {
    return null;
  }
}

export function isPublicKey(value: unknown): value is string {
  return typeof value === 'string' && decodeKey(value, nacl.box.publicKeyLength) !== null;
}

/** Usa la llave guardada en este teléfono o crea una nueva la primera vez. */
export async function getOrCreateKeyPair(userId: string): Promise<ChatKeyPair> {
  const stored = await loadSecretKey(userId);
  const secretKey = stored ? decodeKey(stored, nacl.box.secretKeyLength) : null;
  if (secretKey) return fromSecretKey(secretKey);
  const pair = nacl.box.keyPair();
  await saveSecretKey(userId, naclUtil.encodeBase64(pair.secretKey));
  return fromSecretKey(pair.secretKey);
}

export function seal(plaintext: string, theirPublicKey: string, mine: ChatKeyPair): Sealed {
  const theirKey = decodeKey(theirPublicKey, nacl.box.publicKeyLength);
  if (!theirKey) throw new Error('La llave pública de tu amigo no es válida.');
  const nonce = nacl.randomBytes(nacl.box.nonceLength);
  const data = nacl.box(naclUtil.decodeUTF8(plaintext), nonce, theirKey, mine.secretKey);
  return { nonce: naclUtil.encodeBase64(nonce), data: naclUtil.encodeBase64(data) };
}

/** `null` si no se puede descifrar (otra llave, datos alterados…). */
export function open(sealed: Sealed, theirPublicKey: string, mine: ChatKeyPair): string | null {
  const theirKey = decodeKey(theirPublicKey, nacl.box.publicKeyLength);
  const nonce = decodeKey(sealed.nonce, nacl.box.nonceLength);
  if (!theirKey || !nonce) return null;
  try {
    const plain = nacl.box.open(naclUtil.decodeBase64(sealed.data), nonce, theirKey, mine.secretKey);
    return plain ? naclUtil.encodeUTF8(plain) : null;
  } catch {
    return null;
  }
}

/** Contenido descifrado de un mensaje en espera. */
export type RelayPayload =
  | { t: 'msg'; sentAt: number; text: string }
  | { t: 'img'; sentAt: number; width: number; height: number; data: string };

export function decodeRelayPayload(plain: string): RelayPayload | null {
  let v: Record<string, unknown>;
  try {
    v = JSON.parse(plain) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null || typeof v.sentAt !== 'number') return null;
  if (v.t === 'msg' && typeof v.text === 'string' && v.text.length <= MAX_MESSAGE_LENGTH) {
    return { t: 'msg', sentAt: v.sentAt, text: v.text };
  }
  if (v.t === 'img' && typeof v.width === 'number' && typeof v.height === 'number' && typeof v.data === 'string') {
    return { t: 'img', sentAt: v.sentAt, width: v.width, height: v.height, data: v.data };
  }
  return null;
}

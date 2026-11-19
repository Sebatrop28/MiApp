/** Mensajes que viajan por el canal de datos WebRTC (nunca por un servidor). */
export type WireMessage =
  | { t: 'msg'; id: string; text: string; sentAt: number }
  | { t: 'ack'; ids: string[] };

export const MAX_MESSAGE_LENGTH = 4000;

export function encodeWire(message: WireMessage): string {
  return JSON.stringify(message);
}

/** Devuelve `null` si el dato no es un mensaje válido (versión distinta, datos corruptos…). */
export function decodeWire(data: unknown): WireMessage | null {
  if (typeof data !== 'string') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null) return null;
  const value = parsed as Record<string, unknown>;
  if (
    value.t === 'msg' &&
    typeof value.id === 'string' &&
    typeof value.text === 'string' &&
    value.text.length <= MAX_MESSAGE_LENGTH &&
    typeof value.sentAt === 'number'
  ) {
    return { t: 'msg', id: value.id, text: value.text, sentAt: value.sentAt };
  }
  if (value.t === 'ack' && Array.isArray(value.ids) && value.ids.every((id) => typeof id === 'string')) {
    return { t: 'ack', ids: value.ids as string[] };
  }
  return null;
}

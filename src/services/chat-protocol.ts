/** Mensajes que viajan por el canal de datos WebRTC (nunca por un servidor). */
export type WireMessage =
  | { t: 'msg'; id: string; text: string; sentAt: number }
  | { t: 'img'; id: string; sentAt: number; width: number; height: number; chunks: number }
  | { t: 'chunk'; id: string; i: number; data: string }
  | { t: 'ack'; ids: string[] };

export const MAX_MESSAGE_LENGTH = 4000;
/** Tamaño de cada trozo de imagen (base64). Los canales de datos aceptan ~16 KB por envío sin problemas. */
export const CHUNK_SIZE = 12_000;
/** Imágenes de hasta ~3 MB (en base64 ocupan 4/3). */
export const MAX_CHUNKS = Math.ceil((3 * 1024 * 1024 * 4) / 3 / CHUNK_SIZE);

export function splitChunks(base64: string, size: number = CHUNK_SIZE): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < base64.length; i += size) chunks.push(base64.slice(i, i + size));
  return chunks.length > 0 ? chunks : [''];
}

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
  if (
    value.t === 'img' &&
    typeof value.id === 'string' &&
    typeof value.sentAt === 'number' &&
    typeof value.width === 'number' &&
    typeof value.height === 'number' &&
    Number.isInteger(value.chunks) &&
    (value.chunks as number) > 0 &&
    (value.chunks as number) <= MAX_CHUNKS
  ) {
    return {
      t: 'img',
      id: value.id,
      sentAt: value.sentAt,
      width: value.width,
      height: value.height,
      chunks: value.chunks as number,
    };
  }
  if (
    value.t === 'chunk' &&
    typeof value.id === 'string' &&
    Number.isInteger(value.i) &&
    typeof value.data === 'string' &&
    value.data.length <= CHUNK_SIZE
  ) {
    return { t: 'chunk', id: value.id, i: value.i as number, data: value.data };
  }
  if (value.t === 'ack' && Array.isArray(value.ids) && value.ids.every((id) => typeof id === 'string')) {
    return { t: 'ack', ids: value.ids as string[] };
  }
  return null;
}

interface PendingImage {
  header: Extract<WireMessage, { t: 'img' }>;
  parts: (string | undefined)[];
  received: number;
}

/** Reúne los trozos de las imágenes que van llegando; descarta lo incompleto si se corta la conexión. */
export class ImageAssembler {
  private pending = new Map<string, PendingImage>();

  start(header: Extract<WireMessage, { t: 'img' }>) {
    this.pending.set(header.id, { header, parts: new Array(header.chunks), received: 0 });
  }

  /** Devuelve la imagen completa en base64 cuando llega el último trozo. */
  add(chunk: Extract<WireMessage, { t: 'chunk' }>): { header: Extract<WireMessage, { t: 'img' }>; base64: string } | null {
    const entry = this.pending.get(chunk.id);
    if (!entry || chunk.i < 0 || chunk.i >= entry.parts.length || entry.parts[chunk.i] !== undefined) return null;
    entry.parts[chunk.i] = chunk.data;
    entry.received += 1;
    if (entry.received < entry.parts.length) return null;
    this.pending.delete(chunk.id);
    return { header: entry.header, base64: entry.parts.join('') };
  }

  clear() {
    this.pending.clear();
  }
}

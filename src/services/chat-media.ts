import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Lado mayor de las imágenes enviadas: suficiente para verlas bien en el teléfono y rápido de transferir. */
const MAX_IMAGE_SIDE = 1280;
const JPEG_QUALITY = 0.7;
/** Límite tras comprimir; por encima la transferencia P2P sería demasiado lenta. */
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

export interface ChatImage {
  uri: string;
  width: number;
  height: number;
}

function chatDirectory(userId: string, friendUid: string): Directory {
  const dir = new Directory(Paths.document, 'chat', userId, friendUid);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Reduce y comprime la imagen elegida y la copia a la carpeta privada del chat. */
export async function prepareImage(
  userId: string,
  friendUid: string,
  messageId: string,
  source: { uri: string; width: number; height: number },
): Promise<ChatImage> {
  const context = ImageManipulator.manipulate(source.uri);
  const landscape = source.width >= source.height;
  if (Math.max(source.width, source.height) > MAX_IMAGE_SIDE) {
    context.resize(landscape ? { width: MAX_IMAGE_SIDE, height: null } : { width: null, height: MAX_IMAGE_SIDE });
  }
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY });
  const saved = new File(result.uri);
  if (saved.size > MAX_IMAGE_BYTES) {
    saved.delete();
    throw new Error('La imagen es demasiado grande para enviarla.');
  }
  const destination = new File(chatDirectory(userId, friendUid), `${messageId}.jpg`);
  if (destination.exists) destination.delete();
  saved.move(destination);
  return { uri: destination.uri, width: result.width, height: result.height };
}

export function readImageBase64(uri: string): Promise<string> {
  return new File(uri).base64();
}

/** Guarda una imagen recibida por el chat; solo existe en este teléfono. */
export async function saveReceivedImage(
  userId: string,
  friendUid: string,
  messageId: string,
  base64: string,
): Promise<string> {
  const file = new File(chatDirectory(userId, friendUid), `${messageId}.jpg`);
  if (!file.exists) file.create();
  await file.write(base64, { encoding: 'base64' });
  return file.uri;
}

export const imagesSupported = true;

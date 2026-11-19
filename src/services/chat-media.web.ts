import type { ChatImage } from './chat-media';

export type { ChatImage };
export const MAX_IMAGE_BYTES = 3 * 1024 * 1024;

const UNSUPPORTED = 'Enviar imágenes solo está disponible en la app de Android.';

/** En web no hay sistema de archivos privado: las imágenes solo se envían desde el APK. */
export const imagesSupported = false;

export async function prepareImage(): Promise<ChatImage> {
  throw new Error(UNSUPPORTED);
}

export async function readImageBase64(): Promise<string> {
  throw new Error(UNSUPPORTED);
}

export async function saveReceivedImage(): Promise<string> {
  throw new Error(UNSUPPORTED);
}

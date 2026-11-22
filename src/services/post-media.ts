import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { POST_IMAGE_MAX_LENGTH } from '@/utils/posts';

/** Lado mayor de las fotos publicadas: se ven bien en el teléfono y caben en un documento de Firestore. */
const MAX_SIDE = 1080;
const QUALITIES = [0.6, 0.4, 0.25];

export interface PreparedPostImage {
  uri: string;
  base64: string;
  width: number;
  height: number;
}

/** Reduce y comprime la foto hasta que quepa en Firestore. */
export async function preparePostImage(source: { uri: string; width: number; height: number }): Promise<PreparedPostImage> {
  const context = ImageManipulator.manipulate(source.uri);
  if (Math.max(source.width, source.height) > MAX_SIDE) {
    context.resize(source.width >= source.height ? { width: MAX_SIDE, height: null } : { width: null, height: MAX_SIDE });
  }
  const rendered = await context.renderAsync();
  for (const compress of QUALITIES) {
    const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress, base64: true });
    if (result.base64 && result.base64.length <= POST_IMAGE_MAX_LENGTH) {
      return { uri: result.uri, base64: result.base64, width: result.width, height: result.height };
    }
  }
  throw new Error('La foto es demasiado grande para publicarla.');
}

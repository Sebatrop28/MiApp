import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Las fotos de perfil se recortan en cuadrado de 256 px (unos 20–40 KB). */
const SIZE = 256;
export const AVATAR_MAX_LENGTH = 200_000;

export async function prepareAvatar(source: { uri: string; width: number; height: number }): Promise<string> {
  const side = Math.min(source.width, source.height);
  const context = ImageManipulator.manipulate(source.uri);
  context.crop({ originX: (source.width - side) / 2, originY: (source.height - side) / 2, width: side, height: side });
  context.resize({ width: SIZE, height: SIZE });
  const rendered = await context.renderAsync();
  const result = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  if (!result.base64 || result.base64.length > AVATAR_MAX_LENGTH) throw new Error('No se pudo preparar la foto de perfil.');
  return result.base64;
}

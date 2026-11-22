export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
/** Mismo límite que `firestore.rules`. */
export const DISPLAY_NAME_MAX_LENGTH = 60;
const USERNAME_PATTERN = /^[a-zñ0-9_.]+$/;

/** Los nombres de usuario se comparan sin mayúsculas, sin espacios y sin la «@» inicial (NFC para que la «ñ» sea un solo carácter). */
export function normalizeUsername(input: string): string {
  return input.normalize('NFC').trim().replace(/^@+/, '').toLowerCase();
}

export function validateUsername(input: string): string | null {
  const username = normalizeUsername(input);
  if (!username) return 'Escribe un nombre de usuario.';
  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return `Debe tener entre ${USERNAME_MIN_LENGTH} y ${USERNAME_MAX_LENGTH} caracteres.`;
  }
  if (!USERNAME_PATTERN.test(username)) return 'Usa solo letras (se permite la «ñ»), números, «_» o «.», sin espacios ni acentos.';
  // Firestore reserva los ids con la forma `__…__`.
  if (/^__.*__$/.test(username)) return 'No puede empezar y terminar con «__».';
  return null;
}

/** Id estable de una amistad: los dos uid ordenados, para que ambos lleguen al mismo documento. */
export function friendshipId(a: string, b: string): string {
  return a < b ? `${a}_${b}` : `${b}_${a}`;
}

/** Id de una solicitud: quién la envía y a quién va. */
export function friendRequestId(from: string, to: string): string {
  return `${from}_${to}`;
}

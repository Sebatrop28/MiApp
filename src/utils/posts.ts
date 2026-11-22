/** Mismos límites que `firestore.rules`. */
export const POST_TEXT_MAX_LENGTH = 1000;
export const POST_LINK_MAX_LENGTH = 500;
/** Foto en base64 (documento aparte en `postImages`; Firestore admite hasta 1 MiB por documento). */
export const POST_IMAGE_MAX_LENGTH = 900_000;

/** Debe tener dominio: `https:///` no es válido. */
const LINK_PATTERN = /^https?:\/\/[^\s/?#]+[^\s]*$/i;

/** Quita espacios y añade `https://` si falta. Devuelve `null` si está vacío. */
export function normalizeLink(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function validatePost(input: { text: string; link: string; hasImage: boolean }): string | null {
  const text = input.text.trim();
  const link = normalizeLink(input.link);
  if (!text && !link && !input.hasImage) return 'Escribe algo, añade una foto o un enlace.';
  if (text.length > POST_TEXT_MAX_LENGTH) return `El texto puede tener hasta ${POST_TEXT_MAX_LENGTH} caracteres.`;
  if (link && (link.length > POST_LINK_MAX_LENGTH || !LINK_PATTERN.test(link))) {
    return 'El enlace no es válido. Debe empezar con http:// o https://.';
  }
  return null;
}

/** Texto corto para mostrar un enlace: dominio y nombre del archivo si lo hay. */
export function describeLink(link: string): { host: string; label: string } {
  const match = /^https?:\/\/([^/?#]+)([^?#]*)/i.exec(link);
  if (!match) return { host: link, label: link };
  const host = match[1].replace(/^www\./i, '');
  const last = decodeURIComponentSafe(match[2].split('/').filter(Boolean).pop() ?? '');
  return { host, label: last && /\.[a-z0-9]{2,5}$/i.test(last) ? last : host };
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

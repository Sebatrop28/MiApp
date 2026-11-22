export const COMMUNITY_NAME_MIN_LENGTH = 3;
export const COMMUNITY_NAME_MAX_LENGTH = 40;
export const COMMUNITY_DESCRIPTION_MAX_LENGTH = 300;
export const COMMUNITY_POST_MAX_LENGTH = 1000;

export function normalizeCommunityName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

/** Clave de búsqueda por prefijo (las reglas comprueban que sea `name.lower()`). */
export function communitySearchKey(name: string): string {
  return normalizeCommunityName(name).toLowerCase();
}

export function validateCommunity({ name, description }: { name: string; description: string }): string | null {
  const clean = normalizeCommunityName(name);
  if (clean.length < COMMUNITY_NAME_MIN_LENGTH) return `El nombre debe tener al menos ${COMMUNITY_NAME_MIN_LENGTH} caracteres.`;
  if (clean.length > COMMUNITY_NAME_MAX_LENGTH) return `El nombre no puede pasar de ${COMMUNITY_NAME_MAX_LENGTH} caracteres.`;
  if (description.trim().length > COMMUNITY_DESCRIPTION_MAX_LENGTH) {
    return `La descripción no puede pasar de ${COMMUNITY_DESCRIPTION_MAX_LENGTH} caracteres.`;
  }
  return null;
}

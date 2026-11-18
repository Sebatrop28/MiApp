import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Persistencia de las notas del bloc de notas en el almacenamiento local del dispositivo.
 */

export interface Note {
  id: string;
  text: string;
  /** Marcas de tiempo en milisegundos (Date.now()). */
  createdAt: number;
  updatedAt: number;
}

export const NOTES_STORAGE_KEY = '@miapp/notes/v1';

export function createNoteId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const note = value as Record<string, unknown>;
  return (
    typeof note.id === 'string' &&
    typeof note.text === 'string' &&
    typeof note.createdAt === 'number' &&
    typeof note.updatedAt === 'number'
  );
}

/** Descarta entradas inválidas (p. ej. datos guardados por otra versión). */
export function sanitizeNotes(raw: unknown): Note[] {
  return Array.isArray(raw) ? raw.filter(isNote) : [];
}

export async function loadNotes(): Promise<Note[]> {
  const stored = await AsyncStorage.getItem(NOTES_STORAGE_KEY);
  if (stored === null) return [];
  try {
    return sanitizeNotes(JSON.parse(stored));
  } catch {
    return [];
  }
}

export async function saveNotes(notes: Note[]): Promise<void> {
  await AsyncStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes));
}

/** Primera línea no vacía de la nota, usada como título en la lista. */
export function getNoteTitle(text: string): string {
  const firstLine = text
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0);
  return firstLine ?? 'Nota vacía';
}

/** Texto de la nota sin la primera línea, en una sola línea, para la vista previa. */
export function getNotePreview(text: string): string {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  return lines.slice(1).join(' ');
}

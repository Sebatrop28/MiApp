import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  NOTES_STORAGE_KEY,
  getNotePreview,
  getNoteTitle,
  loadNotes,
  sanitizeNotes,
  saveNotes,
  type Note,
} from '@/services/notes-storage';
import { formatNoteDate } from '@/utils/date';

const note: Note = { id: 'a', text: 'Compras\nleche\npan', createdAt: 1, updatedAt: 2 };

describe('notes-storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('devuelve una lista vacía si no hay notas', async () => {
    await expect(loadNotes()).resolves.toEqual([]);
  });

  it('guarda y recupera las notas', async () => {
    await saveNotes([note]);
    await expect(loadNotes()).resolves.toEqual([note]);
  });

  it('ignora JSON corrupto y entradas inválidas', async () => {
    await AsyncStorage.setItem(NOTES_STORAGE_KEY, '{no-es-json');
    await expect(loadNotes()).resolves.toEqual([]);
    expect(sanitizeNotes([note, { id: 1 }, null, 'x'])).toEqual([note]);
    expect(sanitizeNotes({})).toEqual([]);
  });

  it('obtiene título y vista previa a partir del texto', () => {
    expect(getNoteTitle('\n  Compras \nleche\n\npan')).toBe('Compras');
    expect(getNotePreview('Compras\nleche\n\npan')).toBe('leche pan');
    expect(getNoteTitle('   ')).toBe('Nota vacía');
  });

  it('formatea fechas relativas', () => {
    const now = new Date(2026, 10, 18, 15, 0).getTime();
    expect(formatNoteDate(new Date(2026, 10, 18, 9, 5).getTime(), now)).toBe('Hoy, 09:05');
    expect(formatNoteDate(new Date(2026, 10, 17, 22, 30).getTime(), now)).toBe('Ayer, 22:30');
    expect(formatNoteDate(new Date(2026, 0, 2, 8, 0).getTime(), now)).toBe('02/01/2026, 08:00');
  });
});

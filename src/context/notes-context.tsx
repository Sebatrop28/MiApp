import { createContext, use, useCallback, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { createNoteId, loadNotes, saveNotes, type Note } from '@/services/notes-storage';
import { toErrorMessage } from '@/utils/errors';

export type NotesStatus = 'loading' | 'ready';

export interface NotesContextValue {
  /** Notas ordenadas de la más reciente a la más antigua. */
  notes: Note[];
  status: NotesStatus;
  error: string | null;
  getNote: (id: string) => Note | undefined;
  createNote: () => Note;
  updateNote: (id: string, text: string) => void;
  deleteNote: (id: string) => void;
  dismissError: () => void;
}

/** Tiempo de espera tras la última pulsación antes de escribir en el almacenamiento. */
const SAVE_DELAY_MS = 300;

const NotesContext = createContext<NotesContextValue | null>(null);

/**
 * Proveedor del bloc de notas. Carga las notas guardadas al iniciar y guarda
 * automáticamente cada cambio; también fuerza el guardado si la app pasa a segundo plano.
 */
export interface NotesProviderProps extends PropsWithChildren {
  /** Cuenta dueña de las notas; al cambiar de cuenta el proveedor debe remontarse (`key`). */
  userId: string;
}

export function NotesProvider({ userId, children }: NotesProviderProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [status, setStatus] = useState<NotesStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const notesRef = useRef<Note[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Si la carga falla no se escribe nada, para no sobrescribir las notas guardadas. */
  const canPersist = useRef(false);
  const dirty = useRef(false);

  useEffect(() => {
    let cancelled = false;
    loadNotes(userId)
      .then((loaded) => {
        if (cancelled) return;
        notesRef.current = loaded;
        canPersist.current = true;
        setNotes(loaded);
      })
      .catch(() => {
        if (!cancelled) {
          setError('No se pudieron cargar tus notas. Los cambios no se guardarán hasta reiniciar la app.');
        }
      })
      .finally(() => {
        if (!cancelled) setStatus('ready');
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const flush = useCallback(async () => {
    if (saveTimer.current !== null) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!dirty.current || !canPersist.current) return;
    dirty.current = false;
    try {
      await saveNotes(userId, notesRef.current);
    } catch (e) {
      dirty.current = true;
      setError(`No se pudo guardar la nota: ${toErrorMessage(e)}`);
    }
  }, [userId]);

  const commit = useCallback(
    (next: Note[]) => {
      notesRef.current = next;
      dirty.current = true;
      setNotes(next);
      if (saveTimer.current !== null) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => void flush(), SAVE_DELAY_MS);
    },
    [flush],
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') void flush();
    });
    return () => {
      subscription.remove();
      void flush();
    };
  }, [flush]);

  const getNote = useCallback((id: string) => notesRef.current.find((note) => note.id === id), []);

  const createNote = useCallback(() => {
    const now = Date.now();
    const note: Note = { id: createNoteId(), text: '', createdAt: now, updatedAt: now };
    commit([note, ...notesRef.current]);
    return note;
  }, [commit]);

  const updateNote = useCallback(
    (id: string, text: string) => {
      const current = notesRef.current.find((note) => note.id === id);
      if (!current || current.text === text) return;
      const updated = { ...current, text, updatedAt: Date.now() };
      commit([updated, ...notesRef.current.filter((note) => note.id !== id)]);
    },
    [commit],
  );

  const deleteNote = useCallback(
    (id: string) => commit(notesRef.current.filter((note) => note.id !== id)),
    [commit],
  );

  const dismissError = useCallback(() => setError(null), []);

  const value = useMemo<NotesContextValue>(
    () => ({ notes, status, error, getNote, createNote, updateNote, deleteNote, dismissError }),
    [notes, status, error, getNote, createNote, updateNote, deleteNote, dismissError],
  );

  return <NotesContext value={value}>{children}</NotesContext>;
}

export function useNotes(): NotesContextValue {
  const context = use(NotesContext);
  if (!context) {
    throw new Error('useNotes debe usarse dentro de <NotesProvider>.');
  }
  return context;
}

import { useCallback, useEffect, useRef, useState } from 'react';

import { toErrorMessage } from '@/utils/errors';

export type AsyncStatus = 'loading' | 'refreshing' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

export interface UseAsyncResult<T> extends AsyncState<T> {
  /** Vuelve a ejecutar la carga mostrando el estado de carga completo. */
  reload: () => void;
  /** Recarga conservando los datos actuales (para «deslizar para actualizar»). */
  refresh: () => void;
}

/**
 * Ejecuta una función asíncrona y expone su estado (carga, éxito, error).
 * `asyncFn` debe ser estable (por ejemplo, envuelta en `useCallback`);
 * cuando cambia, la carga se repite automáticamente.
 * Las respuestas obsoletas o que llegan tras desmontar se descartan.
 */
export function useAsync<T>(asyncFn: () => Promise<T>): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading', data: null, error: null });
  const requestId = useRef(0);

  const execute = useCallback(
    async (id: number) => {
      try {
        const data = await asyncFn();
        if (id === requestId.current) setState({ status: 'success', data, error: null });
      } catch (e) {
        if (id === requestId.current) {
          setState((prev) => ({ status: 'error', data: prev.data, error: toErrorMessage(e) }));
        }
      }
    },
    [asyncFn],
  );

  const run = useCallback(
    (mode: 'loading' | 'refreshing') => {
      const id = ++requestId.current;
      setState((prev) => ({
        status: mode === 'refreshing' && prev.data !== null ? 'refreshing' : 'loading',
        data: mode === 'refreshing' ? prev.data : null,
        error: null,
      }));
      void execute(id);
    },
    [execute],
  );

  useEffect(() => {
    const counter = requestId;
    const id = ++counter.current;
    void execute(id);
    return () => {
      // Invalida la petición en curso para ignorar su resultado.
      counter.current++;
    };
  }, [execute]);

  const reload = useCallback(() => run('loading'), [run]);
  const refresh = useCallback(() => run('refreshing'), [run]);

  return { ...state, reload, refresh };
}

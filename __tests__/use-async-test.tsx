import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useAsync } from '@/hooks/use-async';

describe('useAsync', () => {
  it('pasa de carga a éxito', async () => {
    const fn = jest.fn().mockResolvedValue('datos');
    const { result } = await renderHook(() => useAsync(fn));
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe('datos');
    expect(result.current.error).toBeNull();
  });

  it('expone el mensaje de error y permite reintentar', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('Sin conexión')).mockResolvedValueOnce(42);
    const { result } = await renderHook(() => useAsync(fn));

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('Sin conexión');

    await act(async () => {
      result.current.reload();
    });
    await waitFor(() => expect(result.current.status).toBe('success'));
    expect(result.current.data).toBe(42);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

import { fetchHighlights } from '@/services/content';
import { NetworkError } from '@/utils/errors';

describe('fetchHighlights', () => {
  it('devuelve una lista de novedades', async () => {
    const items = await fetchHighlights({ latencyMs: 0 });
    expect(items.length).toBeGreaterThan(0);
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
  });

  it('lanza NetworkError cuando se simula un fallo', async () => {
    await expect(fetchHighlights({ latencyMs: 0, simulateError: true })).rejects.toBeInstanceOf(NetworkError);
  });
});

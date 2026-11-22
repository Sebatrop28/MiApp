import { act, renderHook } from '@testing-library/react-native';

import { useFeed } from '@/hooks/use-feed';
import type { Post } from '@/services/posts';
import { POST_TTL_MS } from '@/utils/posts';

const mockSubscribe = jest.fn();
jest.mock('@/services/posts', () => ({ subscribeToFeed: (...args: unknown[]) => mockSubscribe(...args) }));

const post = (id: string, createdAt: number): Post => ({
  id,
  author: { uid: 'u9', username: 'luis', displayName: 'Luis' },
  text: id,
  link: null,
  image: null,
  likes: [],
  createdAt,
});

describe('useFeed', () => {
  beforeEach(() => jest.useFakeTimers({ now: 1_000_000_000_000 }));
  afterEach(() => jest.useRealTimers());

  it('oculta una publicación cuando cumple 24 horas sin volver a suscribirse', async () => {
    const now = Date.now();
    mockSubscribe.mockImplementation((_authors: string[], callback: (posts: Post[]) => void) => {
      callback([post('vieja', now - POST_TTL_MS + 60_000), post('nueva', now)]);
      return () => {};
    });
    const { result } = await renderHook(() => useFeed(['u9']));
    expect(result.current.posts.map((p) => p.id)).toEqual(['vieja', 'nueva']);

    await act(async () => {
      jest.advanceTimersByTime(62_000);
    });
    expect(result.current.posts.map((p) => p.id)).toEqual(['nueva']);
    expect(mockSubscribe).toHaveBeenCalledTimes(1);
  });
});

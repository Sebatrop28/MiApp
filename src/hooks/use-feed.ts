import { useCallback, useEffect, useState } from 'react';

import { subscribeToFeed, type Post } from '@/services/posts';
import { NetworkError } from '@/utils/errors';

export type FeedState =
  | { status: 'loading'; posts: Post[]; error: null }
  | { status: 'ready'; posts: Post[]; error: null }
  | { status: 'error'; posts: Post[]; error: string };

interface Snapshot {
  key: string;
  posts: Post[];
  error: string | null;
}

/**
 * Publicaciones activas de estos autores, en tiempo real. `authorUids === null` mientras se cargan.
 * `simulateError` viene de *Ajustes → Desarrollo*.
 */
export function useFeed(authorUids: readonly string[] | null, simulateError = false): FeedState & { retry: () => void } {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const authors = authorUids ? [...authorUids].sort().join(',') : null;
  const key = `${attempt}:${authors}`;

  useEffect(() => {
    if (simulateError || authors === null) return;
    return subscribeToFeed(
      authors ? authors.split(',') : [],
      (posts) => setSnapshot({ key, posts, error: null }),
      (error) => setSnapshot((prev) => ({ key, posts: prev?.posts ?? [], error })),
    );
  }, [simulateError, authors, key]);

  const posts = snapshot?.posts ?? [];
  if (simulateError) return { status: 'error', posts, error: new NetworkError().message, retry };
  if (!snapshot || snapshot.key !== key) return { status: 'loading', posts, error: null, retry };
  if (snapshot.error) return { status: 'error', posts, error: snapshot.error, retry };
  return { status: 'ready', posts, error: null, retry };
}

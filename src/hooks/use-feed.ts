import { useCallback, useEffect, useState } from 'react';

import { subscribeToFeed, type Post } from '@/services/posts';
import { NetworkError } from '@/utils/errors';

export type FeedState =
  | { status: 'loading'; posts: Post[]; error: null }
  | { status: 'ready'; posts: Post[]; error: null }
  | { status: 'error'; posts: Post[]; error: string };

interface Snapshot {
  attempt: number;
  posts: Post[];
  error: string | null;
}

/** Publicaciones recientes en tiempo real. `simulateError` viene de *Ajustes → Desarrollo*. */
export function useFeed(simulateError: boolean): FeedState & { retry: () => void } {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [attempt, setAttempt] = useState(0);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    if (simulateError) return;
    return subscribeToFeed(
      (posts) => setSnapshot({ attempt, posts, error: null }),
      (error) => setSnapshot((prev) => ({ attempt, posts: prev?.posts ?? [], error })),
    );
  }, [simulateError, attempt]);

  const posts = snapshot?.posts ?? [];
  if (simulateError) return { status: 'error', posts, error: new NetworkError().message, retry };
  if (!snapshot || snapshot.attempt !== attempt) return { status: 'loading', posts, error: null, retry };
  if (snapshot.error) return { status: 'error', posts, error: snapshot.error, retry };
  return { status: 'ready', posts, error: null, retry };
}

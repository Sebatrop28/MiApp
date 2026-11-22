import { useCallback, useEffect, useState } from 'react';

import { subscribeToFeed, type Post } from '@/services/posts';
import { NetworkError } from '@/utils/errors';
import { POST_TTL_MS } from '@/utils/posts';

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

  const [now, setNow] = useState(() => Date.now());
  const loaded = snapshot?.posts;

  // La consulta fija el corte de 24 h al suscribirse: aquí se ocultan las que caducan después.
  useEffect(() => {
    const upcoming = (loaded ?? []).map((p) => p.createdAt + POST_TTL_MS).filter((t) => t > now);
    if (upcoming.length === 0) return;
    const next = Math.min(...upcoming);
    const timer = setTimeout(() => setNow(Date.now()), Math.max(0, next - Date.now()) + 1000);
    return () => clearTimeout(timer);
  }, [loaded, now]);

  const posts = (loaded ?? []).filter((p) => p.createdAt + POST_TTL_MS > now);
  if (simulateError) return { status: 'error', posts, error: new NetworkError().message, retry };
  if (!snapshot || snapshot.key !== key) return { status: 'loading', posts, error: null, retry };
  if (snapshot.error) return { status: 'error', posts, error: snapshot.error, retry };
  return { status: 'ready', posts, error: null, retry };
}

import type { NewPost, Post } from '@/services/posts';
import type { UserProfile } from '@/services/friends';

/** Sustituto en memoria de `@/services/posts` para las pruebas (sin Firestore). */
type Listener = () => void;

const posts = new Map<string, Post>();
const images = new Map<string, string>();
const listeners = new Set<Listener>();
let counter = 0;

const sorted = () => [...posts.values()].sort((a, b) => b.createdAt - a.createdAt);
const emit = () => listeners.forEach((listener) => listener());

export const toPostsErrorMessage = (error: unknown) => (error instanceof Error ? error.message : 'Error');

export function reset() {
  posts.clear();
  images.clear();
  listeners.clear();
  counter = 0;
}

export function addPost(post: Post, image?: string) {
  posts.set(post.id, post);
  if (image) images.set(post.id, image);
  emit();
}

export function subscribeToFeed(authorUids: readonly string[], callback: (posts: Post[]) => void) {
  const since = Date.now() - 24 * 60 * 60 * 1000;
  const listener = () => callback(sorted().filter((p) => authorUids.includes(p.author.uid) && p.createdAt > since));
  listeners.add(listener);
  listener();
  return () => {
    listeners.delete(listener);
  };
}

export const cleanupExpiredPosts = jest.fn(async () => {});

export const createPost = jest.fn(async (author: UserProfile, post: NewPost) => {
  counter += 1;
  const id = `p${counter}`;
  addPost(
    {
      id,
      author,
      text: post.text.trim(),
      link: post.link.trim() || null,
      image: post.image ? { width: post.image.width, height: post.image.height } : null,
      likes: [],
      createdAt: Date.now() + counter,
    },
    post.image?.base64,
  );
});

export const getPostImage = jest.fn(async (id: string) => images.get(id) ?? null);

export const setLiked = jest.fn(async (id: string, uid: string, liked: boolean) => {
  const post = posts.get(id);
  if (!post) return;
  const likes = post.likes.filter((u) => u !== uid);
  posts.set(id, { ...post, likes: liked ? [...likes, uid] : likes });
  emit();
});

export const deletePost = jest.fn(async (post: Post) => {
  posts.delete(post.id);
  images.delete(post.id);
  emit();
});

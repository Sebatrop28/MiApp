import type { AuthUser } from '@/services/auth';

/** Sustituto en memoria de `@/services/auth` para las pruebas (sin Firebase). */
type Listener = (user: AuthUser | null) => void;

const listeners = new Set<Listener>();
const accounts = new Map<string, { password: string; user: AuthUser }>();
let current: AuthUser | null = null;

function emit() {
  listeners.forEach((listener) => listener(current));
}

export class AuthError extends Error {}

export function reset() {
  listeners.clear();
  accounts.clear();
  current = null;
}

export function setUser(user: AuthUser | null) {
  current = user;
  emit();
}

export function addAccount(email: string, password: string, user: AuthUser) {
  accounts.set(email, { password, user });
}

export function subscribeToAuth(callback: Listener) {
  listeners.add(callback);
  callback(current);
  return () => {
    listeners.delete(callback);
  };
}

export const signInWithEmail = jest.fn(async (email: string, password: string) => {
  const account = accounts.get(email.trim());
  if (!account || account.password !== password) throw new AuthError('Correo o contraseña incorrectos.');
  setUser(account.user);
  return account.user;
});

export const signUpWithEmail = jest.fn(async (name: string, email: string, password: string) => {
  if (accounts.has(email)) throw new AuthError('Ya existe una cuenta con este correo. Inicia sesión.');
  const user: AuthUser = { uid: `uid-${email}`, email, displayName: name, emailVerified: false, provider: 'password' };
  addAccount(email, password, user);
  setUser(user);
  return user;
});

export const signInWithGoogle = jest.fn(async () => null);

export const sendPasswordReset = jest.fn(async () => {});

export const signOut = jest.fn(async () => {
  setUser(null);
});

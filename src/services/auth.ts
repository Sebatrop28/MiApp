import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth';

import { isFirebaseConfigured } from '@/config/firebase-config';

import { toAuthErrorMessage } from './auth-errors';
import { getFirebaseAuth } from './firebase';
import { getGoogleIdToken, signOutFromGoogle } from './google-sign-in';

/** Datos de la cuenta que necesita la interfaz (independiente de Firebase). */
export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  emailVerified: boolean;
  provider: 'password' | 'google' | 'other';
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

const NOT_CONFIGURED =
  'Firebase no está configurado. Completa «extra.firebase» en app.json (ver README).';

function toAuthUser(user: User): AuthUser {
  const providerId = user.providerData[0]?.providerId;
  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    emailVerified: user.emailVerified,
    provider: providerId === 'password' ? 'password' : providerId === 'google.com' ? 'google' : 'other',
  };
}

async function run<T>(operation: () => Promise<T>): Promise<T> {
  if (!isFirebaseConfigured) throw new AuthError(NOT_CONFIGURED);
  try {
    return await operation();
  } catch (e) {
    throw new AuthError(toAuthErrorMessage(e));
  }
}

/** Escucha los cambios de sesión. Devuelve la función para dejar de escuchar. */
export function subscribeToAuth(callback: (user: AuthUser | null) => void): () => void {
  if (!isFirebaseConfigured) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(getFirebaseAuth(), (user) => callback(user ? toAuthUser(user) : null));
}

export function signUpWithEmail(name: string, email: string, password: string): Promise<AuthUser> {
  return run(async () => {
    const { user } = await createUserWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    if (name.trim()) await updateProfile(user, { displayName: name.trim() });
    await sendEmailVerification(user).catch(() => {});
    return toAuthUser(user);
  });
}

export function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  return run(async () => {
    const { user } = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
    return toAuthUser(user);
  });
}

/** Devuelve `null` si la persona cierra el selector de cuentas sin elegir. */
export function signInWithGoogle(): Promise<AuthUser | null> {
  return run(async () => {
    const idToken = await getGoogleIdToken();
    if (!idToken) return null;
    const { user } = await signInWithCredential(getFirebaseAuth(), GoogleAuthProvider.credential(idToken));
    return toAuthUser(user);
  });
}

export function sendPasswordReset(email: string): Promise<void> {
  return run(() => sendPasswordResetEmail(getFirebaseAuth(), email.trim()));
}

export function signOut(): Promise<void> {
  return run(async () => {
    await signOutFromGoogle();
    await firebaseSignOut(getFirebaseAuth());
  });
}

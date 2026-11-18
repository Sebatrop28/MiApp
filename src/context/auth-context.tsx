import { createContext, use, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import * as auth from '@/services/auth';
import type { AuthUser } from '@/services/auth';

export type AuthStatus = 'loading' | 'signedIn' | 'signedOut';

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  signInWithEmail: typeof auth.signInWithEmail;
  signUpWithEmail: typeof auth.signUpWithEmail;
  signInWithGoogle: typeof auth.signInWithGoogle;
  sendPasswordReset: typeof auth.sendPasswordReset;
  signOut: typeof auth.signOut;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Expone la sesión actual; Firebase la restaura sola al abrir la app. */
export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  useEffect(
    () =>
      auth.subscribeToAuth((next) => {
        setUser(next);
        setStatus(next ? 'signedIn' : 'signedOut');
      }),
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signInWithEmail: auth.signInWithEmail,
      signUpWithEmail: auth.signUpWithEmail,
      signInWithGoogle: auth.signInWithGoogle,
      sendPasswordReset: auth.sendPasswordReset,
      signOut: auth.signOut,
    }),
    [user, status],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.');
  }
  return context;
}

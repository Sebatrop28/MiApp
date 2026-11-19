import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

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

  // onAuthStateChanged no avisa de cambios de perfil: el nombre se guarda después de crear la cuenta.
  const signUpWithEmail = useCallback<AuthContextValue['signUpWithEmail']>(async (name, email, password) => {
    const created = await auth.signUpWithEmail(name, email, password);
    setUser(created);
    return created;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      signInWithEmail: auth.signInWithEmail,
      signUpWithEmail,
      signInWithGoogle: auth.signInWithGoogle,
      sendPasswordReset: auth.sendPasswordReset,
      signOut: auth.signOut,
    }),
    [user, status, signUpWithEmail],
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

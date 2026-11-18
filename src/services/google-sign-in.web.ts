/** El inicio de sesión con Google solo está implementado en Android. */
export async function getGoogleIdToken(): Promise<string | null> {
  throw new Error('El inicio de sesión con Google solo está disponible en la app de Android.');
}

export async function signOutFromGoogle(): Promise<void> {}

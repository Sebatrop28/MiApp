import { googleWebClientId } from '@/config/firebase-config';

type GoogleSignInModule = typeof import('@react-native-google-signin/google-signin');

let googleModule: GoogleSignInModule | null = null;

/**
 * Se carga bajo demanda: el módulo nativo no existe en Expo Go y cargarlo al inicio
 * impediría abrir la app (y el inicio de sesión con correo).
 */
async function loadGoogleSignIn(): Promise<GoogleSignInModule> {
  if (!googleModule) {
    const loaded = await import('@react-native-google-signin/google-signin');
    loaded.GoogleSignin.configure({ webClientId: googleWebClientId });
    googleModule = loaded;
  }
  return googleModule;
}

/**
 * Abre el selector de cuentas de Google y devuelve el `idToken` para Firebase,
 * o `null` si la persona cancela.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  const { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } = await loadGoogleSignIn();
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    // Sin esto, Google reutiliza en silencio la última cuenta y no deja elegir otra.
    if (GoogleSignin.hasPreviousSignIn()) await GoogleSignin.signOut();
    const response = await GoogleSignin.signIn();
    if (isCancelledResponse(response)) return null;
    if (!response.data.idToken) {
      throw new Error('Google no devolvió un token. Revisa el googleWebClientId en app.json.');
    }
    return response.data.idToken;
  } catch (e) {
    if (isErrorWithCode(e)) {
      if (e.code === statusCodes.IN_PROGRESS) return null;
      if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services no está disponible en este dispositivo.');
      }
    }
    throw e;
  }
}

export async function signOutFromGoogle(): Promise<void> {
  try {
    const { GoogleSignin } = await loadGoogleSignIn();
    await GoogleSignin.signOut();
  } catch {
    // Sin módulo nativo (Expo Go) no hay sesión de Google que cerrar.
  }
}

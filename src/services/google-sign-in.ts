import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

import { googleWebClientId } from '@/config/firebase-config';

let configured = false;

/**
 * Abre el selector de cuentas de Google y devuelve el `idToken` para Firebase,
 * o `null` si la persona cancela.
 */
export async function getGoogleIdToken(): Promise<string | null> {
  if (!configured) {
    GoogleSignin.configure({ webClientId: googleWebClientId });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
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
  if (!configured) return;
  await GoogleSignin.signOut().catch(() => {});
}

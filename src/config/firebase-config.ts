import Constants from 'expo-constants';
import type { FirebaseOptions } from 'firebase/app';

/**
 * Configuración de Firebase leída de `expo.extra.firebase` en app.json
 * (valores de la «app web» registrada en la consola de Firebase; no son secretos).
 */
interface ExtraConfig {
  firebase?: Partial<FirebaseOptions>;
  /** ID de cliente web de OAuth (Firebase → Authentication → Google → configuración del SDK web). */
  googleWebClientId?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const firebaseConfig: FirebaseOptions = { ...extra.firebase };

export const googleWebClientId = extra.googleWebClientId ?? '';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const isGoogleSignInConfigured = isFirebaseConfigured && googleWebClientId.length > 0;

import Constants from 'expo-constants';
import type { FirebaseOptions } from 'firebase/app';

import type { IceServer } from '@/services/p2p';

/**
 * Configuración de Firebase leída de `expo.extra.firebase` en app.json
 * (valores de la «app web» registrada en la consola de Firebase; no son secretos).
 */
interface ExtraConfig {
  firebase?: Partial<FirebaseOptions>;
  /** ID de cliente web de OAuth (Firebase → Authentication → Google → configuración del SDK web). */
  googleWebClientId?: string;
  /** Servidores STUN/TURN para el chat P2P (opcional; por defecto, STUN públicos de Google). */
  webrtc?: { iceServers?: IceServer[] };
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExtraConfig;

export const firebaseConfig: FirebaseOptions = { ...extra.firebase };

export const googleWebClientId = extra.googleWebClientId ?? '';

export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const isGoogleSignInConfigured = isFirebaseConfigured && googleWebClientId.length > 0;

const DEFAULT_ICE_SERVERS: IceServer[] = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

export const iceServers: IceServer[] = extra.webrtc?.iceServers?.length ? extra.webrtc.iceServers : DEFAULT_ICE_SERVERS;

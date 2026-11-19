import type { PeerConnectionConstructor } from './p2p';

/**
 * WebRTC nativo. Se carga bajo demanda: en Expo Go no existe el módulo nativo y
 * cargarlo al inicio cerraría la app; ahí el chat avisa que hace falta el APK.
 */
export function getPeerConnectionConstructor(): PeerConnectionConstructor | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webrtc = require('react-native-webrtc') as typeof import('react-native-webrtc');
    return webrtc.RTCPeerConnection as unknown as PeerConnectionConstructor;
  } catch {
    return null;
  }
}

import type { PeerConnectionConstructor } from './p2p';

/** En el navegador WebRTC viene incluido. */
export function getPeerConnectionConstructor(): PeerConnectionConstructor | null {
  const ctor = (globalThis as { RTCPeerConnection?: unknown }).RTCPeerConnection;
  return (ctor as PeerConnectionConstructor | undefined) ?? null;
}

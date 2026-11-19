import type { DataChannelLike, IncomingCall, PeerConnectionLike, SessionDescription, Signaling } from '@/services/p2p';

/** WebRTC falso en memoria: dos `FakePeerConnection` se enlazan al intercambiar oferta y respuesta. */
type Listener = (event: never) => void;

class Emitter {
  private listeners = new Map<string, Listener[]>();
  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  emit(type: string, event: unknown = {}) {
    (this.listeners.get(type) ?? []).forEach((l) => (l as (e: unknown) => void)(event));
  }
}

class FakeChannel extends Emitter implements DataChannelLike {
  readyState = 'connecting';
  peer: FakeChannel | null = null;
  send(data: string) {
    if (this.readyState !== 'open') throw new Error('closed');
    const peer = this.peer;
    setTimeout(() => peer?.emit('message', { data }), 0);
  }
  close() {
    if (this.readyState === 'closed') return;
    this.readyState = 'closed';
    this.emit('close');
    this.peer?.close();
  }
  open() {
    this.readyState = 'open';
    this.emit('open');
  }
}

const registry = new Map<string, FakePeerConnection>();
let nextId = 0;

export class FakePeerConnection extends Emitter implements PeerConnectionLike {
  readonly id = `pc${++nextId}`;
  localDescription: { type: string; sdp: string } | null = null;
  iceGatheringState = 'complete';
  connectionState = 'new';
  private channel: FakeChannel | null = null;
  private remoteId: string | null = null;

  constructor() {
    super();
    registry.set(this.id, this);
  }
  createDataChannel() {
    this.channel = new FakeChannel();
    return this.channel;
  }
  async createOffer() {
    return { type: 'offer', sdp: `fake:${this.id}` };
  }
  async createAnswer() {
    return { type: 'answer', sdp: `fake:${this.id}` };
  }
  async setLocalDescription(description: { type: string; sdp?: string }) {
    this.localDescription = { type: description.type, sdp: description.sdp ?? '' };
  }
  async setRemoteDescription(description: SessionDescription) {
    this.remoteId = description.sdp.replace('fake:', '');
    if (description.type === 'answer') {
      const callee = registry.get(this.remoteId);
      if (!callee || !this.channel) return;
      const remote = new FakeChannel();
      this.channel.peer = remote;
      remote.peer = this.channel;
      callee.emit('datachannel', { channel: remote });
      setTimeout(() => {
        this.channel?.open();
        remote.open();
      }, 0);
    }
  }
  close() {
    this.connectionState = 'closed';
    this.channel?.close();
  }
}

/** Señalización en memoria con la misma forma que la de Firestore. */
export function createMemorySignaling() {
  const calls = new Map<string, IncomingCall & { to: string; answer?: SessionDescription }>();
  const listeners = new Set<() => void>();
  const emit = () => listeners.forEach((l) => l());
  const signaling: Signaling = {
    async publishOffer(from, to, offer) {
      const id = `${from}_${to}`;
      calls.set(id, { id, from, to, offer, createdAt: Date.now() });
      emit();
      return id;
    },
    async publishAnswer(id, answer) {
      const call = calls.get(id);
      if (call) call.answer = answer;
      emit();
    },
    watchAnswer(id, callback) {
      const listener = () => {
        const answer = calls.get(id)?.answer;
        if (answer) callback(answer);
      };
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    subscribeToIncoming(uid, callback) {
      const listener = () => callback([...calls.values()].filter((c) => c.to === uid && !c.answer));
      listeners.add(listener);
      listener();
      return () => listeners.delete(listener);
    },
    async deleteCall(id) {
      calls.delete(id);
      emit();
    },
  };
  return { signaling, calls, reset: () => (calls.clear(), listeners.clear()) };
}

/**
 * Conexión directa entre dos teléfonos con WebRTC (canal de datos cifrado con DTLS).
 * Se usa ICE sin «trickle»: se espera a reunir todos los candidatos y se publica un
 * único SDP, así la señalización es un solo documento con oferta y respuesta.
 *
 * Los tipos son estructurales para poder usar `react-native-webrtc`, el WebRTC del
 * navegador o un polyfill de Node en pruebas.
 */
export interface SessionDescription {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp: string;
}

export interface IceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

interface Listenable {
  addEventListener(type: string, listener: (event: never) => void): void;
}

export interface DataChannelLike extends Listenable {
  readonly readyState: string;
  readonly bufferedAmount?: number;
  send(data: string): void;
  close(): void;
}

export interface PeerConnectionLike extends Listenable {
  readonly localDescription: { type: string; sdp: string } | null;
  readonly iceGatheringState: string;
  readonly connectionState: string;
  createDataChannel(label: string, options?: { ordered?: boolean }): DataChannelLike;
  createOffer(): Promise<{ type: string; sdp?: string }>;
  createAnswer(): Promise<{ type: string; sdp?: string }>;
  setLocalDescription(description: { type: string; sdp?: string }): Promise<void>;
  setRemoteDescription(description: SessionDescription): Promise<void>;
  close(): void;
}

export type PeerConnectionConstructor = new (configuration: { iceServers: IceServer[] }) => PeerConnectionLike;

export interface IncomingCall {
  id: string;
  from: string;
  offer: SessionDescription;
  createdAt: number;
}

export interface Signaling {
  /** Devuelve el id de la llamada. */
  publishOffer(from: string, to: string, offer: SessionDescription): Promise<string>;
  publishAnswer(callId: string, answer: SessionDescription): Promise<void>;
  watchAnswer(callId: string, callback: (answer: SessionDescription) => void): () => void;
  subscribeToIncoming(uid: string, callback: (calls: IncomingCall[]) => void, onError: (error: unknown) => void): () => void;
  deleteCall(callId: string): Promise<void>;
}

export interface SessionHandlers {
  onOpen: () => void;
  onMessage: (data: string) => void;
  onClose: () => void;
}

export interface SessionDeps {
  PeerConnection: PeerConnectionConstructor;
  iceServers: IceServer[];
  signaling: Signaling;
  /** Tiempo máximo para que se abra el canal antes de rendirse. */
  timeoutMs?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const ICE_GATHERING_TIMEOUT_MS = 5_000;
const MAX_BUFFERED_BYTES = 256 * 1024;

function waitForIceGathering(pc: PeerConnectionLike): Promise<void> {
  if (pc.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ICE_GATHERING_TIMEOUT_MS);
    pc.addEventListener('icegatheringstatechange', () => {
      if (pc.iceGatheringState === 'complete') {
        clearTimeout(timer);
        resolve();
      }
    });
  });
}

function localDescription(pc: PeerConnectionLike): SessionDescription {
  const description = pc.localDescription;
  if (!description) throw new Error('WebRTC no generó la descripción local.');
  return { type: description.type as SessionDescription['type'], sdp: description.sdp };
}

/** Una conexión con un amigo: como llamante (`call`) o respondiendo una oferta (`answer`). */
export class PeerSession {
  private readonly pc: PeerConnectionLike;
  private channel: DataChannelLike | null = null;
  private closed = false;
  private callId: string | null = null;
  private answered = false;
  private unwatch: (() => void) | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly deps: SessionDeps,
    private readonly handlers: SessionHandlers,
  ) {
    this.pc = new deps.PeerConnection({ iceServers: deps.iceServers });
    this.pc.addEventListener('connectionstatechange', () => {
      if (this.pc.connectionState === 'failed' || this.pc.connectionState === 'closed') this.close();
    });
  }

  get isOpen(): boolean {
    return !this.closed && this.channel?.readyState === 'open';
  }

  get isClosed(): boolean {
    return this.closed;
  }

  async call(from: string, to: string): Promise<void> {
    this.startTimeout();
    try {
      this.attach(this.pc.createDataChannel('chat', { ordered: true }));
      await this.pc.setLocalDescription(await this.pc.createOffer());
      await waitForIceGathering(this.pc);
      if (this.closed) return;
      const callId = await this.deps.signaling.publishOffer(from, to, localDescription(this.pc));
      this.callId = callId;
      if (this.closed) {
        void this.deps.signaling.deleteCall(callId);
        return;
      }
      this.unwatch = this.deps.signaling.watchAnswer(callId, (answer) => {
        if (this.answered || this.closed) return;
        this.answered = true;
        this.unwatch?.();
        this.unwatch = null;
        void this.deps.signaling.deleteCall(callId);
        this.pc.setRemoteDescription(answer).catch(() => this.close());
      });
    } catch {
      this.close();
    }
  }

  async answer(call: IncomingCall): Promise<void> {
    this.startTimeout();
    try {
      this.pc.addEventListener('datachannel', (event: { channel: DataChannelLike }) => this.attach(event.channel));
      await this.pc.setRemoteDescription(call.offer);
      await this.pc.setLocalDescription(await this.pc.createAnswer());
      await waitForIceGathering(this.pc);
      if (this.closed) return;
      await this.deps.signaling.publishAnswer(call.id, localDescription(this.pc));
    } catch {
      this.close();
    }
  }

  send(data: string): boolean {
    if (!this.isOpen || !this.channel) return false;
    try {
      this.channel.send(data);
      return true;
    } catch {
      return false;
    }
  }

  /** Envía respetando el búfer del canal, para no saturarlo con imágenes grandes. */
  async sendWhenReady(data: string): Promise<boolean> {
    while (this.isOpen && (this.channel?.bufferedAmount ?? 0) > MAX_BUFFERED_BYTES) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    return this.send(data);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    if (this.timer) clearTimeout(this.timer);
    this.unwatch?.();
    if (this.callId && !this.answered) void this.deps.signaling.deleteCall(this.callId);
    try {
      this.channel?.close();
    } catch {}
    try {
      this.pc.close();
    } catch {}
    this.handlers.onClose();
  }

  private startTimeout() {
    this.timer = setTimeout(() => {
      if (!this.isOpen) this.close();
    }, this.deps.timeoutMs ?? DEFAULT_TIMEOUT_MS);
  }

  private attach(channel: DataChannelLike) {
    this.channel = channel;
    channel.addEventListener('open', () => {
      if (this.timer) clearTimeout(this.timer);
      if (!this.closed) this.handlers.onOpen();
    });
    channel.addEventListener('message', (event: { data: unknown }) => {
      if (!this.closed && typeof event.data === 'string') this.handlers.onMessage(event.data);
    });
    channel.addEventListener('close', () => this.close());
  }
}

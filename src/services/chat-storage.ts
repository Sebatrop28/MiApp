import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Historial del chat, guardado solo en este teléfono (por cuenta y por amigo).
 * `pending`: aún no llegó al otro teléfono; `delivered`: el otro teléfono confirmó que lo guardó.
 */
export interface ChatMessage {
  id: string;
  /** uid de quien lo escribió. */
  from: string;
  text: string;
  sentAt: number;
  status: 'pending' | 'delivered';
}

export function chatStorageKey(userId: string, friendUid: string): string {
  return `@miapp/chat/v1/${userId}/${friendUid}`;
}

export function createMessageId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function isChatMessage(value: unknown): value is ChatMessage {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    typeof m.id === 'string' &&
    typeof m.from === 'string' &&
    typeof m.text === 'string' &&
    typeof m.sentAt === 'number' &&
    (m.status === 'pending' || m.status === 'delivered')
  );
}

export async function loadMessages(userId: string, friendUid: string): Promise<ChatMessage[]> {
  const stored = await AsyncStorage.getItem(chatStorageKey(userId, friendUid));
  if (!stored) return [];
  try {
    const parsed: unknown = JSON.parse(stored);
    return Array.isArray(parsed) ? sortMessages(parsed.filter(isChatMessage)) : [];
  } catch {
    return [];
  }
}

export async function saveMessages(userId: string, friendUid: string, messages: ChatMessage[]): Promise<void> {
  await AsyncStorage.setItem(chatStorageKey(userId, friendUid), JSON.stringify(messages));
}

export function sortMessages(messages: ChatMessage[]): ChatMessage[] {
  return [...messages].sort((a, b) => a.sentAt - b.sentAt || a.id.localeCompare(b.id));
}

/** Añade un mensaje recibido; si ya estaba (reenvío tras reconectar) no se duplica. */
export function addReceived(messages: ChatMessage[], message: ChatMessage): ChatMessage[] {
  if (messages.some((m) => m.id === message.id && m.from === message.from)) return messages;
  return sortMessages([...messages, message]);
}

export function markDelivered(messages: ChatMessage[], ids: readonly string[], ownUid: string): ChatMessage[] {
  const set = new Set(ids);
  let changed = false;
  const next = messages.map((m) => {
    if (m.from === ownUid && m.status === 'pending' && set.has(m.id)) {
      changed = true;
      return { ...m, status: 'delivered' as const };
    }
    return m;
  });
  return changed ? next : messages;
}

export function pendingMessages(messages: ChatMessage[], ownUid: string): ChatMessage[] {
  return messages.filter((m) => m.from === ownUid && m.status === 'pending');
}

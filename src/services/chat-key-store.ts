import * as SecureStore from 'expo-secure-store';

/** La llave privada del chat se guarda cifrada por Android (Keystore) y nunca sale del teléfono. */
const keyName = (userId: string) => `miapp_chat_key_v1_${userId.replace(/[^A-Za-z0-9._-]/g, '_')}`;

export function loadSecretKey(userId: string): Promise<string | null> {
  return SecureStore.getItemAsync(keyName(userId));
}

export function saveSecretKey(userId: string, secretKey: string): Promise<void> {
  return SecureStore.setItemAsync(keyName(userId), secretKey);
}

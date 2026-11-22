import AsyncStorage from '@react-native-async-storage/async-storage';

/** En web no hay almacenamiento seguro nativo: la llave queda en el almacenamiento local del navegador. */
const keyName = (userId: string) => `@miapp/chat-key/v1/${userId}`;

export function loadSecretKey(userId: string): Promise<string | null> {
  return AsyncStorage.getItem(keyName(userId));
}

export function saveSecretKey(userId: string, secretKey: string): Promise<void> {
  return AsyncStorage.setItem(keyName(userId), secretKey);
}

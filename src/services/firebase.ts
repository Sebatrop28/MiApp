import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getReactNativePersistence, initializeAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

import { firebaseConfig } from '@/config/firebase-config';

let auth: Auth | null = null;

/** Instancia única de Firebase Auth; la sesión se guarda en AsyncStorage para no pedir login en cada arranque. */
export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  if (getApps().length > 0) {
    auth = getAuth(getApp());
    return auth;
  }
  const app = initializeApp(firebaseConfig);
  auth = initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) });
  return auth;
}

/** Firestore de la misma app que Auth, para que las reglas reciban la sesión actual. */
export function getFirebaseDb(): Firestore {
  return getFirestore(getFirebaseAuth().app);
}

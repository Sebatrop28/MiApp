import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

import { firebaseConfig } from '@/config/firebase-config';

/** En web Firebase guarda la sesión en IndexedDB por defecto. */
export function getFirebaseAuth(): Auth {
  return getAuth(getApps().length > 0 ? getApp() : initializeApp(firebaseConfig));
}

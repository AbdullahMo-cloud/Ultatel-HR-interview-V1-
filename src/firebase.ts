import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import defaultFirebaseConfig from '../firebase-applet-config.json';

let firebaseConfig: any = defaultFirebaseConfig;

if (typeof window !== 'undefined') {
  const customConfigStr = window.localStorage.getItem('ultatel_custom_firebase_config');
  if (customConfigStr) {
    try {
      firebaseConfig = JSON.parse(customConfigStr);
    } catch (e) {
      console.warn("Could not parse custom Firebase config, using default", e);
    }
  }
}

// Ensure we don't double initialize and support the proper configuration safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);


import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBHBsNOvgAk8E1d_FUuCV5YuQ2D2jmk0Fs",
  authDomain: "bdrp-1bda0.firebaseapp.com",
  databaseURL: "https://bdrp-1bda0-default-rtdb.firebaseio.com",
  projectId: "bdrp-1bda0",
  storageBucket: "bdrp-1bda0.firebasestorage.app",
  messagingSenderId: "919573541759",
  appId: "1:919573541759:web:7c005691c589ad20f0204a",
  measurementId: "G-X8GSFW2CDT"
};

// Ensure we don't double initialize and support the proper configuration safely
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Enable offline persistent cache for robust real-time synchronization
export const db = initializeFirestore(app, {
  // Offline cache temporarily disabled for debugging sync issues
});

export const auth = getAuth(app);


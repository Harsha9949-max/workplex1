/**
 * WorkPlex — Firebase Configuration
 * Production-ready Firebase initialization with all services
 * Singleton pattern with environment-aware configuration
 */
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  connectAuthEmulator,
  setPersistence,
  browserLocalPersistence,
  Auth,
} from 'firebase/auth';
import {
  getFirestore,
  enableIndexedDbPersistence,
  connectFirestoreEmulator,
  Firestore,
} from 'firebase/firestore';
import {
  getStorage,
  connectStorageEmulator,
  FirebaseStorage,
} from 'firebase/storage';

// ============================================================
// Firebase Configuration
// ============================================================

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyB8dSrqp4kr_k7zN6zzL0B0TudCbn236Bs',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'workplex-gig-0408.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'workplex-gig-0408',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'workplex-gig-0408.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '35989350247',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:35989350247:web:b0db4b1eaf189ce02ef1c2',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

// ============================================================
// Singleton Initialization
// ============================================================

const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Auth with local persistence (survives page refresh/close)
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export const googleProvider: GoogleAuthProvider = new GoogleAuthProvider();

// Configure Google provider to always prompt account selection
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Set auth persistence to LOCAL (survives page refresh and browser close)
if (typeof window !== 'undefined') {
  setPersistence(auth, browserLocalPersistence).catch((err: Error) => {
    console.warn('[Firebase] Auth persistence failed:', err);
  });
}

// Enable Firestore offline persistence (works across tabs gracefully)
if (typeof window !== 'undefined' && getApps().length === 1) {
  enableIndexedDbPersistence(db).catch((err: { code?: string }) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open — only one can enable persistence
      console.warn('[Firebase] Firestore persistence: multiple tabs open, using online mode');
    } else if (err.code === 'unimplemented') {
      // Browser doesn't support IndexedDB
      console.warn('[Firebase] Firestore persistence not available in this browser');
    }
  });
}

// ============================================================
// Emulator Support (Development Only)
// ============================================================

// Uncomment when using Firebase emulator suite locally:
// if (import.meta.env.DEV && import.meta.env.VITE_USE_EMULATOR === 'true') {
//   connectAuthEmulator(auth, 'http://localhost:9099');
//   connectFirestoreEmulator(db, 'localhost', 8080);
//   connectStorageEmulator(storage, 'localhost', 9199);
//   console.log('[Firebase] Connected to emulator suite');
// }

// ============================================================
// Utility Exports
// ============================================================

/**
 * Check if Firebase is initialized and ready
 */
export const isFirebaseReady = (): boolean => {
  return getApps().length > 0;
};

/**
 * Get current Firebase project ID
 */
export const getProjectId = (): string => {
  return app.options.projectId || 'unknown';
};

export default app;

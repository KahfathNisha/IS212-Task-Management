import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Guard conditions
const hasApiKey = Boolean(import.meta.env.VITE_FIREBASE_API_KEY);
const isTest = Boolean(import.meta.env.VITEST); // Vite/Vitest set this when running tests
const isBrowser = typeof window !== 'undefined';

let app = null;
let auth = null;
let db = null;
let functions = null;
let storage = null;

if (!isTest && hasApiKey && isBrowser) {
  console.log('🔥 Initializing Firebase with config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
  });
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  // If the developer enables emulator mode via env, connect client SDK to emulators
  if (import.meta.env.VITE_FIREBASE_USE_EMULATOR === 'true') {
    try {
      console.log('🧪 Connecting Firebase client SDK to emulators');
      // default emulator hosts (override via Vite env if necessary)
      const authHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://localhost:9099';
      const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST || 'localhost';
      const firestorePort = parseInt(import.meta.env.VITE_FIRESTORE_EMULATOR_PORT || '8080', 10);
      connectAuthEmulator(auth, authHost, { disableWarnings: true });
      connectFirestoreEmulator(db, firestoreHost, firestorePort);
    } catch (err) {
      console.warn('⚠️ Failed to connect client SDK to emulators:', err);
    }
  }
  functions = getFunctions(app);
  storage = getStorage(app);
  console.log('✅ Firebase initialized successfully');
} else {
  if (isTest) console.log('⏸ Skipping Firebase initialization for test environment (VITEST).');
  else if (!hasApiKey) console.warn('⚠️ Skipping Firebase initialization: missing VITE_FIREBASE_API_KEY.');
}

// Collection names
export const collections = {
  projects: 'projects',
  users: 'users',
  tasks: 'tasks',
  notifications: 'notifications'
};

// Firestore helper functions
export const firestoreHelpers = {
  async getUserByEmail(email) {
    if (!db) return null;
    try {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const usersRef = collection(db, collections.users);
      const q = query(usersRef, where('email', '==', email));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const doc = snapshot.docs[0];
        return { id: doc.id, ...doc.data() };
      }
      return null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }
};

// Exports: in tests these will be null / mocked by Vitest setup
export { auth, db, functions, storage };
export default app;

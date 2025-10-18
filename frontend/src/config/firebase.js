import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';
// We only import the functions we need, not the service itself initially
import { getMessaging, getToken, onMessage } from "firebase/messaging";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

console.log('🔥 Initializing Firebase with config:', { 
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain 
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// --- THIS IS THE FIX ---
// 1. Declare 'messaging' only ONCE using 'let'.
let messaging = null;

// 2. Conditionally initialize it only if we are NOT in a test environment.
if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  try {
    messaging = getMessaging(app);
  } catch (err) {
    console.warn("Firebase Messaging is not supported in this environment.", err);
  }
}

// Initialize other Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Export the potentially null 'messaging' object and its related functions
export { messaging, getToken, onMessage };

console.log('✅ Firebase initialized successfully');

export const collections = {
  users: 'users',
  tasks: 'tasks',
  projects: 'projects',
  passwordResets: 'passwordResets',
  loginAttempts: 'loginAttempts',
  notifications: 'notifications',
  reports: 'reports'
};

// Your existing helper functions are preserved and correct.
export const firestoreHelpers = {
  createUserDocument: async (uid, userData) => {
    const { doc, setDoc } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, userData.email);
    const userDoc = {
      uid,
      email: userData.email,
      name: userData.name || '',
      role: userData.role || 'staff',
      createdAt: new Date().toISOString(),
      // ... other fields
    };
    await setDoc(userRef, userDoc, { merge: true });
    return userDoc;
  },

  getUserByEmail: async (email) => {
    const { doc, getDoc } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, email);
    const userDoc = await getDoc(userRef);
    return userDoc.exists() ? { id: userDoc.id, ...userDoc.data() } : null;
  },

  updateLastLogin: async (email) => {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, email);
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      failedAttempts: 0,
      lockedUntil: null
    });
  },

  recordFailedLogin: async (email) => {
    // ... your existing logic for this helper
  }
};

export default app;


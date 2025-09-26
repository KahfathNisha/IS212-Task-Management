// src/config/firebase.js
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyCY2S4NyCq_gNNlSRCJgCpX2zW4-z9wNjA",
  authDomain: "is212-task-management.firebaseapp.com",
  projectId: "is212-task-management",
  storageBucket: "is212-task-management.firebasestorage.app",
  messagingSenderId: "320036814196",
  appId: "1:320036814196:web:80392adc43882a0b4a8021",
  measurementId: "G-3CFDCZE7PG"
};

console.log('🔥 Initializing Firebase with config:', { 
  projectId: firebaseConfig.projectId,
  authDomain: firebaseConfig.authDomain 
});

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Log successful initialization
console.log('✅ Firebase initialized successfully');
console.log('🔐 Auth instance:', auth);

export const collections = {
  users: 'users',
  tasks: 'tasks',
  projects: 'projects',
  passwordResets: 'passwordResets',
  loginAttempts: 'loginAttempts',
  notifications: 'notifications',
  reports: 'reports'
};

// Helper functions for Firestore operations
export const firestoreHelpers = {
  /**
   * Create or update user document
   */
  createUserDocument: async (uid, userData) => {
    const { doc, setDoc } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, userData.email);
    
    const userDoc = {
      uid,
      email: userData.email,
      name: userData.name || '',
      role: userData.role || 'staff',
      createdAt: new Date().toISOString(),
      failedAttempts: 0,
      lockedUntil: null,
      lastLogin: new Date().toISOString(),
      securityQuestion: userData.securityQuestion || '',
      securityAnswer: userData.securityAnswer || '', // Should be hashed in production
      updatedAt: new Date().toISOString()
    };
    
    await setDoc(userRef, userDoc, { merge: true });
    return userDoc;
  },

  /**
   * Get user document by email
   */
  getUserByEmail: async (email) => {
    const { doc, getDoc } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, email);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  },

  /**
   * Update last login timestamp
   */
  updateLastLogin: async (email) => {
    const { doc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, email);
    
    await updateDoc(userRef, {
      lastLogin: serverTimestamp(),
      failedAttempts: 0,
      lockedUntil: null
    });
  },

  /**
   * Record failed login attempt
   */
  recordFailedLogin: async (email) => {
    const { doc, getDoc, updateDoc, serverTimestamp } = await import('firebase/firestore');
    const userRef = doc(db, collections.users, email);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) return null;
    
    const userData = userDoc.data();
    const attempts = (userData.failedAttempts || 0) + 1;
    const now = Date.now();
    
    const updateData = {
      failedAttempts: attempts,
      lastFailedAttempt: serverTimestamp()
    };
    
    // Lock account after 5 attempts for 30 minutes
    if (attempts >= 5) {
      updateData.lockedUntil = now + (30 * 60 * 1000);
    }
    
    await updateDoc(userRef, updateData);
    
    return {
      attempts,
      isLocked: attempts >= 5,
      lockedUntil: updateData.lockedUntil
    };
  }
};

export default app;
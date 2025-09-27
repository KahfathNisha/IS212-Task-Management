// backend/src/config/firebase.js (Backend - Admin SDK)
const admin = require('firebase-admin');
require('dotenv').config();

console.log('🔥 Initializing Firebase Admin SDK...');

try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log('🔑 Using service account key from:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const serviceAccount = require(require('path').resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.log('🔑 Using default credentials (no service account key)');
      admin.initializeApp();
    }
    console.log('✅ Firebase Admin SDK initialized successfully');
  } else {
    console.log('✅ Firebase Admin SDK already initialized');
  }
} catch (error) {
  console.error('❌ Firebase Admin SDK initialization failed:', error.message);
  throw error;
}

// Export initialized services
const auth = admin.auth();
const db = admin.firestore(); // Use Firestore

console.log('📦 Firebase services exported: auth, db, admin');

module.exports = { admin, auth, db };
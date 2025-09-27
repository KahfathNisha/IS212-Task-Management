// backend/src/config/firebase.js (Backend - Admin SDK)
const admin = require('firebase-admin');
require('dotenv').config();

console.log('🔥 Initializing Firebase Admin SDK...');

// Initialize Firebase Admin SDK only once
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_PATH) {
      console.log('🔑 Using service account key from:', process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: 'g1-fairprice-tm',
        storageBucket: 'g1-fairprice-tm.firebasestorage.app'
      });
    } else {
      console.log('🔑 Using default credentials (no service account key)');
      admin.initializeApp({
        projectId: 'g1-fairprice-tm',
        storageBucket: 'g1-fairprice-tm.firebasestorage.app'
      });
    }
    console.log('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization failed:', error.message);
    throw error;
  }
} else {
  console.log('✅ Firebase Admin SDK already initialized');
}

// Export initialized services
const auth = admin.auth();
const db = admin.firestore();

console.log('📦 Firebase services exported: auth, db, admin');

module.exports = { admin, auth, db };
const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK with production configuration
let initialized = false;

try {
  if (!admin.apps || admin.apps.length === 0) {
    // Use the existing service account key file for production Firebase
    try {
      // eslint-disable-next-line global-require
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
      });
      console.log('✅ Firebase Admin initialized with serviceAccountKey.json for production');
      initialized = true;
    } catch (loadErr) {
      console.error('❌ Failed to load serviceAccountKey.json:', loadErr.message);
      throw new Error('Missing service account key - cannot connect to Firebase');
    }
  }
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', err);
  throw err;
}

// Export the initialized services
const auth = admin.auth();
const db = admin.firestore();

if (db && typeof db.settings === 'function') {
  try { 
    db.settings({ ignoreUndefinedProperties: true }); 
  } catch (err) { 
    console.warn('⚠️ Could not set Firestore settings:', err.message); 
  }
}

module.exports = {
  admin,
  auth,
  db
};

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Initialize the Firebase Admin SDK with production configuration.
// CI/Actions: support loading the whole service account JSON from the
// FIREBASE_SERVICE_ACCOUNT_KEY env var (recommended) so secrets are not
// committed to the repo. Also fall back to emulator mode when configured.
let initialized = false;
const keyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');

try {
  if (!admin.apps || admin.apps.length === 0) {
    // 1) Env var containing the full JSON
    if (keyEnv) {
      try {
        const serviceAccount = JSON.parse(keyEnv);
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId: process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID
        });
        console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY env var');
        initialized = true;
      } catch (parseErr) {
        console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseErr.message);
        throw parseErr;
      }

    // 2) Local file (existing behavior for local dev)
    } else if (fs.existsSync(keyPath)) {
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
        throw loadErr;
      }

    // 3) Emulator mode (useful for CI that runs the Firestore emulator)
    } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HOST) {
      // Initialize app without credentials when pointing at emulator
      admin.initializeApp();
      console.log('⚠️ Firebase Admin initialized in emulator mode (no service account)');
      initialized = true;

    } else {
      console.error('❌ Missing Firebase credentials: set FIREBASE_SERVICE_ACCOUNT_KEY or provide serviceAccountKey.json or configure the emulator.');
      throw new Error('Missing service account key - cannot connect to Firebase');
    }
  }
} catch (err) {
  console.error('❌ Failed to initialize Firebase Admin SDK:', err.message || err);
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

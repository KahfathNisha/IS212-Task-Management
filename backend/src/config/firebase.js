const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Detect CI environment more reliably
const isCI = process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true';
const isEmulatorMode = process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_EMULATOR_HOST || isCI;

// For CI, always prioritize emulator mode
if (isEmulatorMode) {
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'all-in-one-smu'
    });
    console.log('⚠️ Firebase Admin initialized in emulator mode (CI environment)');
  }
} else {
  // Original production logic for non-CI environments
  const keyEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const keyPath = path.resolve(__dirname, 'serviceAccountKey.json');

  console.log('🔍 Firebase initialization debug:');
  console.log('  - isEmulatorMode:', isEmulatorMode);
  console.log('  - FIREBASE_SERVICE_ACCOUNT_KEY present:', !!keyEnv);
  console.log('  - FIREBASE_SERVICE_ACCOUNT_KEY length:', keyEnv ? keyEnv.length : 'N/A');
  console.log('  - serviceAccountKey.json exists:', fs.existsSync(keyPath));
  console.log('  - FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
  console.log('  - VITE_FIREBASE_PROJECT_ID:', process.env.VITE_FIREBASE_PROJECT_ID);

  try {
    if (!admin.apps || admin.apps.length === 0) {
      // 1) Env var containing the full JSON
      if (keyEnv) {
        console.log('🔄 Attempting to initialize from FIREBASE_SERVICE_ACCOUNT_KEY env var');
        try {
          const serviceAccount = JSON.parse(keyEnv);
          console.log('✅ Successfully parsed FIREBASE_SERVICE_ACCOUNT_KEY JSON');
          console.log('  - Service account project_id:', serviceAccount.project_id);
          console.log('  - Service account client_email:', serviceAccount.client_email);
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
          });
          console.log('✅ Firebase Admin initialized from FIREBASE_SERVICE_ACCOUNT_KEY env var');
        } catch (parseErr) {
          console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', parseErr.message);
          console.error('  - Raw env var value (first 100 chars):', keyEnv.substring(0, 100));
          throw parseErr;
        }
      // 2) Local file
      } else if (fs.existsSync(keyPath)) {
        console.log('🔄 Attempting to initialize from serviceAccountKey.json file');
        try {
          const serviceAccount = require('./serviceAccountKey.json');
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            projectId: process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID
          });
          console.log('✅ Firebase Admin initialized with serviceAccountKey.json for production');
        } catch (loadErr) {
          console.error('❌ Failed to load serviceAccountKey.json:', loadErr.message);
          throw loadErr;
        }
      } else {
        console.error('❌ Missing Firebase credentials: set FIREBASE_SERVICE_ACCOUNT_KEY or provide serviceAccountKey.json');
        throw new Error('Missing service account key - cannot connect to Firebase');
      }
    }
  } catch (err) {
    console.error('❌ Failed to initialize Firebase Admin SDK:', err.message || err);
    throw err;
  }
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

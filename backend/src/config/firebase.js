const admin = require('firebase-admin');

// Initialize the Firebase Admin SDK with a safe fallback for CI/emulator environments.
// If a local `serviceAccountKey.json` exists, use it. Otherwise, fall back to an
// emulator-friendly or application-default initialization so tests don't require
// a checked-in secret.

let initialized = false;
try {
  if (!admin.apps || admin.apps.length === 0) {
    // Try to load a local service account key if present
    try {
      // eslint-disable-next-line global-require
      const serviceAccount = require('./serviceAccountKey.json');
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: process.env.GCLOUD_PROJECT || undefined
      });
      console.log('✅ Firebase Admin initialized with serviceAccountKey.json');
      initialized = true;
    } catch (loadErr) {
      // serviceAccountKey.json not found or failed to load. Fall back.
      console.warn('⚠️ serviceAccountKey.json not found or could not be loaded. Falling back to emulator/default initialization.');

      // If emulators are configured, initialize with projectId only. The Admin SDK
      // will connect to emulators when the corresponding *_EMULATOR_HOST env vars are set.
      try {
        // Initialize without explicitly setting projectId so the Admin SDK
        // will pick up the emulator/project configuration automatically.
        admin.initializeApp();
        console.log('✅ Firebase Admin initialized in emulator/default mode (no service account).');
        initialized = true;
      } catch (initErr) {
        console.error('❌ Failed to initialize Firebase Admin in fallback mode:', initErr);
        // Do not throw here; allow the rest of the app/tests to handle missing admin behavior.
      }
    }
  }
} catch (err) {
  console.error('❌ Unexpected error while initializing Firebase Admin SDK:', err);
}

// Export the initialized services (or minimal placeholders) for use in other parts of your app
const auth = (admin.apps && admin.apps.length > 0) ? admin.auth() : undefined;
const db = (admin.apps && admin.apps.length > 0) ? admin.firestore() : undefined;
if (db && typeof db.settings === 'function') {
  try { db.settings({ ignoreUndefinedProperties: true }); } catch (err) { /* ignore */ }
}

module.exports = {
  admin,
  auth,
  db
};

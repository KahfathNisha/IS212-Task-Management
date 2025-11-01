// Firebase initialization for tests (defaults to emulator for safety)
require('dotenv').config({ path: '../src/config/.env' });

const admin = require('firebase-admin');

// For tests: Default to emulator unless explicitly told to use production
// Set USE_PRODUCTION_FIRESTORE=true to override (not recommended for tests)
const useProduction = process.env.USE_PRODUCTION_FIRESTORE === 'true';
const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
const useEmulator = !useProduction; // Default to emulator for safety

// IMPORTANT: Set FIRESTORE_EMULATOR_HOST BEFORE requiring firebase-admin
// This ensures Admin SDK connects to emulator automatically
if (useEmulator && !process.env.FIRESTORE_EMULATOR_HOST) {
  process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
}

if (!admin.apps.length) {
  if (useEmulator) {
    // Connect to Firestore emulator (env var already set above)
    admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'task-mgmt-test' });
    console.log(`🧪 [TEST MODE] Using Firestore emulator: ${process.env.FIRESTORE_EMULATOR_HOST}`);
    console.log(`   ✅ Tests will NOT write to production Firebase`);
  } else {
    // Production Firebase (only if explicitly enabled)
    // Remove emulator host to ensure we use production
    delete process.env.FIRESTORE_EMULATOR_HOST;
    try {
      const serviceAccount = require('../src/config/serviceAccountKey.json');
      admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
      console.log(`⚠️  [WARNING] Using PRODUCTION Firestore - tests will modify real data!`);
      console.log(`   Set USE_PRODUCTION_FIRESTORE=false to use emulator instead`);
    } catch (err) {
      console.warn('⚠️ No serviceAccountKey.json found. Falling back to emulator mode.');
      process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
      admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || 'task-mgmt-test' });
      console.log(`🧪 [TEST MODE] Using Firestore emulator: ${emulatorHost}`);
    }
  }
}

const db = admin.firestore();

module.exports = { admin, db, useEmulator };


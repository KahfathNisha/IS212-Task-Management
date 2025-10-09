const admin = require('firebase-admin');

// --- THIS IS THE FIX ---
// Load the service account key you downloaded from Firebase.
// Make sure the path to the JSON file is correct.
const serviceAccount = require('./serviceAccountKey.json');

// Initialize the Firebase Admin SDK
if (!admin.apps || admin.apps.length === 0) {
  try {
    admin.initializeApp({
      // Use the credentials from your service account key file
      credential: admin.credential.cert(serviceAccount),
      // Optional: Add your database URL if you use Realtime Database
      // databaseURL: "https://<YOUR-PROJECT-ID>.firebaseio.com" 
    });
    console.log('✅ Firebase Admin SDK initialized successfully with service account.');
  } catch (error) {
    console.error('❌ Firebase Admin SDK initialization error:', error);
    process.exit(1);
  }
}

// Export the initialized services for use in other parts of your app
const auth = admin.auth();
const db = admin.firestore();
db.settings({ ignoreUndefinedProperties: true });

module.exports = {
  admin,
  auth,
  db
};

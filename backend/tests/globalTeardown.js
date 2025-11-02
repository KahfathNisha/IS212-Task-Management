const { admin, db } = require('../src/config/firebase');

module.exports = async function globalTeardown() {
  // Best-effort shutdown of Firebase Admin and Firestore client to avoid open handles
  try {
    if (db && typeof db.terminate === 'function') {
      await db.terminate();
      // small delay to allow termination to complete
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch (e) {
    // ignore
  }

  try {
    if (admin && Array.isArray(admin.apps) && admin.apps.length > 0) {
      await Promise.all(admin.apps.map((a) => a.delete && a.delete()));
    }
  } catch (e) {
    // ignore
  }

  // give Node a tiny moment to let handles close
  await new Promise((r) => setTimeout(r, 300));
};

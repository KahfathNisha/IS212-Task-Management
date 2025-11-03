// Compatibility shim so tests under `backend/tests` can require('../config/firebase')
// while the real implementation lives in `backend/src/config/firebase.js`.
try {
  module.exports = require('../src/config/firebase');
} catch (err) {
  // If requiring fails, export a minimal stub to avoid crashing test runner.
  // Individual tests may mock the exported members as needed.
  // Log the error for debugging but don't throw so tests can set up their own mocks.
  // eslint-disable-next-line no-console
  console.warn('Warning: backend/config/firebase shim failed to load backend/src/config/firebase:', err && err.message);
  module.exports = { admin: null, auth: null, db: null };
}

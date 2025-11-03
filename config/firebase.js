// Repo-level shim so tests that `require('../config/firebase')` from
// different test folders resolve consistently.
// Prefer the backend implementation when available.
try {
  // Try backend src config first
  module.exports = require('./backend/src/config/firebase');
} catch (e1) {
  try {
    // Fallback to backend config (compat/shim) if present
    module.exports = require('./backend/config/firebase');
  } catch (e2) {
    // Last-resort: export minimal stub so tests can mock what they need.
    // Log a warning to help debugging in CI.
    // eslint-disable-next-line no-console
    console.warn('Warning: Could not load backend firebase config shim; exporting stub.');
    module.exports = { admin: null, auth: null, db: null };
  }
}

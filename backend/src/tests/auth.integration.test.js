/* Integration tests for auth flows using the Firebase emulators.
   REQUIREMENTS: Firestore emulator (default localhost:8080) and
   Auth emulator (default localhost:9099) must be running before
   executing these tests.
*/


// Use NODE_ENV=test to prevent server.js auto-listen, but still initialize
// Firebase in the test by requiring the config after setting emulator env vars.
process.env.NODE_ENV = 'test';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'all-in-one-smu';
// Point to local emulators (adjust if your emulator uses other hosts/ports)
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';

// Require and initialize firebase admin BEFORE importing the app so the
// controllers use the emulator-backed admin instance.
const { admin, db } = require('./../config/firebase');
const request = require('supertest');
const app = require('../server');

const base = request(app);

const axios = require('axios');

describe('Auth integration tests (emulator)', () => {
  const email = `e2e.user+${Date.now()}@example.com`;
  const password = 'ValidPass123!';
  // Increase Jest timeout slightly for emulator setup
  jest.setTimeout(30000);

  // small helper to add a timeout to potentially-hanging promises
  // ensure the timer is cleared if the promise resolves/rejects to avoid leaving a Node timer open
  const withTimeout = (p, ms = 5000) => new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error('operation timed out')), ms);
    Promise.resolve(p).then((v) => { clearTimeout(t); resolve(v); }).catch((e) => { clearTimeout(t); reject(e); });
  });

  beforeAll(async () => {
    // Clean collections used by tests (best-effort). Use timeouts so tests don't hang
    if (!db) {
      console.warn('⚠️ Firestore `db` is not available in test environment; skipping cleanup.');
      return;
    }
    try {
      const usersSnap = await withTimeout(db.collection('Users').get(), 5000);
      for (const doc of usersSnap.docs) {
        // set to null to mimic delete without depending on delete permissions
        await withTimeout(db.collection('Users').doc(doc.id).set(null), 5000).catch(() => {});
      }
    } catch (err) {
      console.warn('⚠️ Skipping Users cleanup (emulator may be offline):', err.message);
    }
    try {
      const prsSnap = await withTimeout(db.collection('passwordResets').get(), 5000);
      for (const d of prsSnap.docs) await withTimeout(db.collection('passwordResets').doc(d.id).set(null), 5000).catch(() => {});
    } catch (err) {
      // ignore
    }
  }, 20000);

  test('Register -> record failed attempts -> lockout -> check lockout', async () => {
    // 1) Register
    const registerRes = await base.post('/api/auth/register').send({
      firstName: 'E2E',
      lastName: 'User',
      email,
      password,
      department: 'qa',
      role: 'staff',
      title: 'Tester',
      securityQuestion: 'Fav color?',
      securityAnswer: 'blue'
    }).expect(201);

    expect(registerRes.body.success).toBe(true);

    // 2) Record failed attempts up to lock threshold
    for (let i = 0; i < 5; i++) {
      await base.post('/api/auth/record-failed-attempt').send({ email }).expect(200);
    }

    // 3) Check lockout
    const check = await base.post('/api/auth/check-lockout').send({ email }).expect(200);
    expect(check.body.isLocked).toBe(true);
    expect(check.body.message).toBeDefined();
  }, 20000);

  test('Password reset flow (request -> verify -> reset)', async () => {
    // Request password reset
    const reqRes = await base.post('/api/auth/request-password-reset').send({ email }).expect(200);
    expect(reqRes.body.success).toBe(true);
    const { resetCode, securityQuestion } = reqRes.body;
    expect(resetCode).toBeDefined();
    expect(securityQuestion).toBeDefined();

    // Verify security answer (correct)
    await base.post('/api/auth/verify-security-answer').send({ resetCode, answer: 'blue' }).expect(200);

    // Attempt reset with weak password -> should fail
    await base.post('/api/auth/reset-password').send({ resetCode, newPassword: 'weak' }).expect(400);

    // Reset with a valid strong password
    const resetOk = await base.post('/api/auth/reset-password').send({ resetCode, newPassword: 'NewStrongPass123!' }).expect(200);
    expect(resetOk.body.success).toBe(true);
  }, 20000);

  test('Register duplicate user returns 409', async () => {
    // same email as earlier
    await base.post('/api/auth/register').send({
      firstName: 'E2E',
      lastName: 'User',
      email,
      password,
      department: 'qa',
      role: 'staff',
      title: 'Tester',
      securityQuestion: 'Fav color?',
      securityAnswer: 'blue'
    }).expect(409);
  });

  test('End-to-end login: sign in via Auth emulator then call backend /login', async () => {
    // Create a custom token via admin SDK and exchange it for ID token
    const userRecord = await admin.auth().getUserByEmail(email);
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    const emulatorUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
    const signInUrl = `${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=unused`;

    const signInResp = await axios.post(signInUrl, {
      token: customToken,
      returnSecureToken: true
    }).catch(err => {
      const data = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      throw new Error(`Failed to exchange custom token via emulator: ${data}`);
    });

    const idToken = signInResp.data.idToken;
    expect(idToken).toBeDefined();

    // Call backend login endpoint with the ID token
    const loginResp = await base.post('/api/auth/login').send({ idToken });
    if (loginResp.status !== 200) {
      console.error('DEBUG - /api/auth/login failed', { status: loginResp.status, body: loginResp.body, text: loginResp.text });
    }
    expect(loginResp.status).toBe(200);
    expect(loginResp.body.success).toBe(true);
    expect(loginResp.body.user).toBeDefined();
  }, 20000);

  afterAll(async () => {
    // best-effort cleanup: remove created user and password reset docs
    try {
      // delete users doc
      await db.collection('Users').doc(email).set(null);
      // delete password reset docs
      const prs = await db.collection('passwordResets').get();
      for (const d of prs.docs) await db.collection('passwordResets').doc(d.id).set(null);
    } catch (err) {
      // ignore
    }
    // Close the Firebase admin app to prevent open handles
    try {
      const apps = admin.apps || [];
      for (const a of apps) {
        // delete each initialized app
        // admin.app().delete() returns a promise
        // some environments use admin.apps array of App instances
        if (typeof a.delete === 'function') await a.delete();
      }
    } catch (err) {
      // ignore
    }
    // give background SDK tasks a moment to finish and allow Jest to exit cleanly
    try {
      if (db && typeof db.terminate === 'function') {
        await db.terminate();
      }
    } catch (err) {
      // ignore termination errors
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  });
});

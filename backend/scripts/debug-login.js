// Quick debug script to reproduce the failing /api/auth/login call and print full response.
process.env.NODE_ENV = 'test';
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || 'localhost:9099';
process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || 'all-in-one-smu';

const axios = require('axios');
const request = require('supertest');
const { admin } = require('../src/config/firebase');
const app = require('../src/server');

async function run() {
  const email = `debug.user+${Date.now()}@example.com`;
  const password = 'DebugPass123!';

  const base = request(app);

  console.log('Registering user:', email);
  const reg = await base.post('/api/auth/register').send({
    firstName: 'Debug', lastName: 'User', email, password, department: 'qa', role: 'staff', title: 'T', securityQuestion: 'Q', securityAnswer: 'A'
  });
  console.log('Register status:', reg.status, reg.body);

  // Create custom token and exchange for ID token
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    const customToken = await admin.auth().createCustomToken(userRecord.uid);
    const emulatorUrl = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}`;
    const signInUrl = `${emulatorUrl}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=unused`;
    const resp = await axios.post(signInUrl, { token: customToken, returnSecureToken: true });
    console.log('Emulator exchange OK, got idToken length:', resp.data.idToken?.length || 0);

    const loginResp = await base.post('/api/auth/login').send({ idToken: resp.data.idToken });
    console.log('/api/auth/login status:', loginResp.status);
    console.log('/api/auth/login body:', JSON.stringify(loginResp.body, null, 2));
  } catch (err) {
    console.error('DEBUG ERROR:', err.response?.data || err.message || err);
  }
  // try to close admin apps
  try { for (const a of admin.apps || []) { if (a && typeof a.delete === 'function') await a.delete(); } } catch (e) {}
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });

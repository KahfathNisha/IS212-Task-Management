// Unit tests for authController using Jest with mocked firebase config and middleware.
process.env.NODE_ENV = 'test';

jest.mock('../middleware/auth.js', () => ({
  default: {
    verifyToken: (req, res, next) => { req.user = { email: 'john.doe@company.com', role: 'staff', department: 'engineering' }; next(); },
    loginRateLimiter: (req, res, next) => next()
  },
  verifyToken: (req, res, next) => { req.user = { email: 'john.doe@company.com', role: 'staff', department: 'engineering' }; next(); },
  loginRateLimiter: (req, res, next) => next(),
  checkRole: (...roles) => (req, res, next) => next()
}));

// Lightweight in-memory mocks for firebase admin and db
jest.mock('../config/firebase', () => {
  // Simple in-memory auth store
  const users = new Map();

  const fakeAuth = {
    async getUserByEmail(email) {
      if (!users.has(email)) {
        const e = new Error('user not found');
        e.code = 'auth/user-not-found';
        throw e;
      }
      return users.get(email);
    },
    async createUser({ email, password, displayName }) {
      const uid = `uid-${Math.random().toString(36).slice(2, 8)}`;
      const rec = { uid, email, displayName };
      users.set(email, rec);
      return rec;
    },
    async updateUser(uid, data) {
      return { uid, ...data };
    },
    async verifyIdToken(token) {
      return { email: 'john.doe@company.com', uid: 'uid-john' };
    },
    __reset() {
      users.clear();
    }
  };

  // Simple in-memory Firestore-like storage
  const storage = Object.create(null);

  function makeDocRef(collectionName, id) {
    const key = `${collectionName}/${id}`;
    return {
      async get() {
        const data = storage[key];
        return { exists: data !== undefined, data: () => data };
      },
      async set(value) {
        storage[key] = value;
      },
      async update(updates) {
        const prev = storage[key] || {};
        const next = { ...prev };
        for (const k of Object.keys(updates)) {
          if (k.includes('.')) {
            const parts = k.split('.');
            let cur = next;
            for (let i = 0; i < parts.length - 1; i++) {
              cur[parts[i]] = cur[parts[i]] || {};
              cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = updates[k];
          } else {
            next[k] = updates[k];
          }
        }
        storage[key] = next;
      }
    };
  }

  const db = {
    collection(name) {
      return {
        doc(id) {
          return makeDocRef(name, id);
        },
        async get() {
          const docs = Object.keys(storage)
            .filter(k => k.startsWith(name + '/'))
            .map(k => ({ id: k.split('/')[1], data: () => storage[k] }));
          return { docs };
        }
      };
    },
    __reset() {
      for (const k of Object.keys(storage)) delete storage[k];
    }
  };

  const admin = {
    auth: () => fakeAuth,
    firestore: {
      FieldValue: { serverTimestamp: () => Date.now() },
      Timestamp: { fromMillis: (ms) => ({ toMillis: () => ms }) }
    }
  };

  return { admin, auth: fakeAuth, db };
});

const authController = require('../controllers/authController');
const cfg = require('../config/firebase');

const TEST_USER_ID = 'john.doe@company.com';

function makeRes() { let statusCode = 200; let body = null; return { status(code) { statusCode = code; return this; }, json(obj) { body = obj; return { statusCode, body }; }, _get() { return { statusCode, body }; } }; }

beforeEach(async () => {
  // reset in-memory db and auth
  cfg.db.__reset();
  if (cfg.auth.__reset) cfg.auth.__reset();

  // baseline user profile
  await cfg.db.collection('Users').doc(TEST_USER_ID).set({ name: 'Test User', role: 'staff', email: TEST_USER_ID, failedAttempts: 0, lockedUntil: null });
  await cfg.auth.createUser({ email: TEST_USER_ID, password: 'x', displayName: 'Test User' });
});

describe('Auth Controller - unit tests', () => {
  test('recordFailedAttempt increments and locks after max attempts', async () => {
    const req = { body: { email: TEST_USER_ID } };
    for (let i = 0; i < 5; i++) { const res = makeRes(); await authController.recordFailedAttempt(req, res); }
    const userDoc = await cfg.db.collection('Users').doc(TEST_USER_ID).get(); const data = userDoc.data(); expect(data.failedAttempts).toBe(5); expect(data.lockedUntil).not.toBeNull(); const millis = (typeof data.lockedUntil.toMillis === 'function') ? data.lockedUntil.toMillis() : data.lockedUntil; expect(millis).toBeGreaterThan(Date.now() - 1000);
  });

  test('registerUser creates user on valid data', async () => {
    const req = { body: { firstName: 'Michelle', lastName: 'Goh', email: 'michelle.goh@company.com', password: 'ValidPassword123!', department: 'System Solutioning', role: 'staff', title: 'Support Team', securityQuestion: 'Q', securityAnswer: 'A' } };
    const res = makeRes(); await authController.registerUser(req, res); const result = res._get(); expect(result.statusCode).toBe(201);
    const userDoc = await cfg.db.collection('Users').doc('michelle.goh@company.com').get(); expect(userDoc.exists).toBe(true); expect(userDoc.data().name).toBe('Michelle Goh'); expect(userDoc.data().testEmail).toBe('breannong@gmail.com');
  });

  test('registerUser returns 409 when auth user exists', async () => {
    await cfg.auth.createUser({ email: 'existing@company.com', password: 'x', displayName: 'Existing' });
    const req = { body: { firstName: 'E', lastName: 'X', email: 'existing@company.com', password: 'ValidPass1!', department: 'D', role: 'staff', title: 'T', securityQuestion: 'Q', securityAnswer: 'A' } };
    const res = makeRes(); await authController.registerUser(req, res); const result = res._get(); expect(result.statusCode).toBe(409);
  });

  test('registerUser rejects weak password', async () => {
    const req = { body: { firstName: 'A', lastName: 'B', email: 'a@b.com', password: 'weak', department: 'D', role: 'staff', title: 'T', securityQuestion: 'Q', securityAnswer: 'A' } };
    const res = makeRes(); await authController.registerUser(req, res); const result = res._get(); expect(result.statusCode).toBe(400); expect(result.body.message).toMatch(/Password must be 8\+ characters/);
  });

  test('registerUser rejects missing fields', async () => {
    const req = { body: { firstName: '', lastName: 'X', email: 'a@b.com', password: 'ValidPass1!', department: 'D', role: 'staff', title: 'T', securityQuestion: 'Q', securityAnswer: 'A' } };
    const res = makeRes(); await authController.registerUser(req, res); const result = res._get(); expect(result.statusCode).toBe(400); expect(result.body.message).toBe('All fields are required.');
  });

  test('checkLockout returns not locked for unknown user', async () => {
    const req = { body: { email: 'unknown@company.com' } };
    const res = makeRes();
    await authController.checkLockout(req, res);
    const r = res._get();
    expect(r.statusCode).toBe(200);
    expect(r.body.isLocked).toBe(false);
  });

  test('recordFailedAttempt returns invalid credentials for non-existent user', async () => {
    const req = { body: { email: 'noexist@company.com' } };
    const res = makeRes();
    await authController.recordFailedAttempt(req, res);
    const r = res._get();
    expect(r.statusCode).toBe(200);
    expect(r.body.message).toBe('Invalid credentials.');
  });

  test('verifySecurityAnswer rejects incorrect answer', async () => {
    // Create a reset request and a user
    const resetCode = 'reset-xyz';
    await cfg.db.collection('passwordResets').doc(resetCode).set({
      email: TEST_USER_ID,
      createdAt: Date.now(),
      expiresAt: Date.now() + 100000,
      used: false,
      verified: false
    });

    const req = { body: { resetCode, answer: 'wrong-answer' } };
    const res = makeRes();
    await authController.verifySecurityAnswer(req, res);
    const r = res._get();
    expect(r.statusCode).toBe(401);
    expect(r.body.message).toMatch(/Incorrect answer/);
  });

  test('resetPassword rejects weak new password and invalid code', async () => {
    const resetCode = 'reset-abc';
    // make a reset doc but mark verified true to get past verification
    await cfg.db.collection('passwordResets').doc(resetCode).set({
      email: TEST_USER_ID,
      createdAt: Date.now(),
      expiresAt: Date.now() + 100000,
      used: false,
      verified: true
    });

    // Weak password
    const reqWeak = { body: { resetCode, newPassword: 'short' } };
    const resWeak = makeRes();
    await authController.resetPassword(reqWeak, resWeak);
    const rWeak = resWeak._get();
    expect(rWeak.statusCode).toBe(400);
    expect(rWeak.body.message).toMatch(/Password must be at least 12 characters/);

    // Invalid code
    const reqInvalid = { body: { resetCode: 'does-not-exist', newPassword: 'ValidPass1234' } };
    const resInvalid = makeRes();
    await authController.resetPassword(reqInvalid, resInvalid);
    const rInvalid = resInvalid._get();
    expect(rInvalid.statusCode).toBe(400);
    expect(rInvalid.body.message).toMatch(/Invalid reset code/);
  });
});
/**
 * External integration test — verifies that your backend can actually
 * send an email via the real SendGrid API and receive a 202 Accepted.
 *
 * Run this manually or behind a flag: ALLOW_EXTERNAL=1 npm run test:integration
 */

const request = require('supertest');
const crypto = require('crypto');
const app = require('../src/server'); // your Express app

jest.setTimeout(20000); // Give SendGrid time to respond

// Load env vars manually if not already loaded
require('dotenv').config({ path: './backend/.env' }); // adjust path if needed

const to = process.env.EMAIL_TO_TEST;          // your test inbox
const from = process.env.EMAIL_FROM;           // verified sender in SendGrid
const apiKey = process.env.SENDGRID_API_KEY;   // must be valid key

if (!apiKey || !to || !from) {
  console.warn('⚠️ Missing required env vars: SENDGRID_API_KEY, EMAIL_TO_TEST, EMAIL_FROM');
}

// Optional safety: only run when explicitly allowed
const allowExternal = process.env.ALLOW_EXTERNAL === '1';

(allowExternal ? describe : describe.skip)('External SendGrid integration test', () => {

  it('should send an actual email through SendGrid', async () => {
    // Generate unique subject for identification
    const token = crypto.randomBytes(5).toString('hex');
    const subject = `[EXT INT TEST] Email Notification ${token}`;
    const text = `This is an automated SendGrid integration test. Token: ${token}`;

    // Send request to your backend's email route
    const res = await request(app)
      .post('/api/notifications/test/send-email')
      .send({ to, subject, text });

    // ---- Assertions ----
    // Route should be reachable
    expect(res.status).toBe(200);

    // Backend should report SendGrid accepted
    expect(res.body).toHaveProperty('accepted', true);
    expect(res.body).toHaveProperty('statusCode', 202);

    // Optional: log message ID for tracing in SendGrid dashboard
    console.log('✅ Email accepted by SendGrid.');
    console.log('   Message ID:', res.body.requestId);
    console.log('   Subject:', subject);
  });

});
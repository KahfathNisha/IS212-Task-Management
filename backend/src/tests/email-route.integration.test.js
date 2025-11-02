const request = require('supertest');
const crypto = require('crypto');
const app = require('../server'); // your Express app

// Give SendGrid a couple of seconds; network can be spiky in CI
jest.setTimeout(20000);

const to = process.env.EMAIL_TO_TEST || 'test@example.com';
const from = process.env.EMAIL_FROM || process.env.SENDGRID_FROM_EMAIL;

// Set NODE_ENV to 'test' for this test file
process.env.NODE_ENV = 'test';

describe('Email integration with SendGrid', () => {
  it('tests email endpoint structure (mocks SendGrid)', async () => {
    // Mock the EmailService.sendTestEmail method to avoid external dependencies
    const EmailService = require('../services/emailService');
    const mockSendTestEmail = jest.spyOn(EmailService, 'sendTestEmail')
      .mockResolvedValue([{ headers: { 'x-message-id': 'test-message-id' } }]);

    // Unique token in the subject so you can later search logs if needed
    const token = crypto.randomBytes(6).toString('hex');
    const subject = `[INT TEST] Notification smoke ${token}`;
    const text = `This is an automated test email. Token: ${token}`;

    const res = await request(app)
      .post('/api/notifications/test/send-email')
      .send({ to, subject, text });

    // 1) Our route must be reachable & succeed
    expect(res.status).toBe(200);

    // 2) It should report SendGrid accepted the message
    expect(res.body).toHaveProperty('accepted', true);
    expect(res.body).toHaveProperty('statusCode', 202);
    expect(res.body).toHaveProperty('requestId', 'test-message-id');

    // Verify the service method was called with correct parameters
    expect(mockSendTestEmail).toHaveBeenCalledWith(to, subject, text);

    // Restore the original method
    mockSendTestEmail.mockRestore();
  });

  it('rejects non-whitelisted recipient in test', async () => {
    const res = await request(app)
      .post('/api/notifications/test/send-email')
      .send({ to: 'random@not-allowed.com', subject: 'x', text: 'x' });

    if (process.env.NODE_ENV === 'test') {
      expect(res.status).toBe(403);
    } else {
      // In non-test environments you might allow it; adapt to your policy
      expect([200, 403]).toContain(res.status);
    }
  });
});
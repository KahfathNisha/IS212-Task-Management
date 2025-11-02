import { test, expect } from '@playwright/test';

const backendBase = 'http://localhost:3000';

test.describe('Password Reset (stable API-driven)', () => {
  test('request and complete password reset via backend API (stable)', async ({ page }) => {
    const firstName = `PW${Date.now()}`;
    const lastName = 'Reset';
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const password = 'Playwright1!';

    // Ensure user exists via API (ignore conflict)
    await page.request.post(`${backendBase}/api/auth/register`, { data: {
      firstName, lastName, email, password, department: 'qa', role: 'staff', title: 'Tester', securityQuestion: 'Fav?', securityAnswer: 'blue'
    }}).catch(() => null);

    // 1) Request password reset
    const reqRes = await page.request.post(`${backendBase}/api/auth/request-password-reset`, { data: { email } });
    expect(reqRes.status()).toBe(200);
    const body = await reqRes.json();
    expect(body.success).toBe(true);
    const { resetCode, securityQuestion } = body;
    expect(resetCode).toBeDefined();
    expect(securityQuestion).toBeDefined();

    // 2) Verify security answer
    const verifyRes = await page.request.post(`${backendBase}/api/auth/verify-security-answer`, { data: { resetCode, answer: 'blue' } });
    expect(verifyRes.status()).toBe(200);

    // 3) Attempt weak password -> should fail
    const weakRes = await page.request.post(`${backendBase}/api/auth/reset-password`, { data: { resetCode, newPassword: 'weak' } });
    expect(weakRes.status()).toBe(400);

    // 4) Reset with a valid strong password
    const okRes = await page.request.post(`${backendBase}/api/auth/reset-password`, { data: { resetCode, newPassword: 'NewStrongPass123!' } });
    expect(okRes.status()).toBe(200);
    const okBody = await okRes.json();
    expect(okBody.success).toBe(true);
  });
});

import { test, expect } from '@playwright/test';

test.describe('Auth E2E (Playwright)', () => {
  // Prefer explicit IPv4 to avoid CI environments resolving `localhost` to IPv6 (::1)
  const backendBase = 'http://127.0.0.1:3000';
  const email = `pw.user+${Date.now()}@example.com`;
  const password = 'Playwright1!';

  test.beforeEach(async ({ page }) => {
    // Ensure backend has the user registered via API (ignore conflict)
    await page.request.post(`${backendBase}/api/auth/register`, {
      data: {
        firstName: 'PW', lastName: 'User', email, password, department: 'qa', role: 'staff', title: 'Tester', securityQuestion: 'Q', securityAnswer: 'A'
      }
    }).catch(() => null);
  });

  test('can log in through UI using Auth emulator', async ({ page }) => {
    // Navigate to full URL to avoid baseURL resolution issues
    const loginUrl = 'http://localhost:5173/login';
    const resp = await page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
    // If navigation failed, log status for diagnosis
    if (!resp || !resp.ok()) {
      console.log('Playwright: navigation response', resp && resp.status());
    }

    // Wait for app to settle and network requests to complete
    await page.waitForLoadState('networkidle');

    // Fill login form using robust selectors (Vuetify tends to render labels differently)
    await page.locator('input[type="email"]').waitFor({ state: 'visible', timeout: 15000 });
    await page.locator('input[type="email"]').type(email);
    await page.locator('input[type="password"]').type(password);
    // capture console logs to diagnose auth issues in CI
    page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Wait longer for the client SDK to sign in and persist token
    await page.waitForFunction(() => !!localStorage.getItem('firebaseIdToken'), null, { timeout: 60000 });
    const idToken = await page.evaluate(() => localStorage.getItem('firebaseIdToken'));
    expect(idToken).toBeTruthy();

    // Verify backend /me returns user
    const me = await page.request.get(`${backendBase}/api/auth/me`, { headers: { Authorization: `Bearer ${idToken}` } });
    const data = await me.json();
    expect(data.success).toBe(true);
    expect(data.user.email).toBe(email);
  });
});

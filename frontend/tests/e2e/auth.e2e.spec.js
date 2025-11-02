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
    // Poll the Auth emulator REST API until the user appears to avoid a race
    // where the client tries to sign in before the emulator has fully recorded the user.
    const authEmulatorHost = process.env.PLAYWRIGHT_FIREBASE_AUTH_EMULATOR_HOST || 'http://127.0.0.1:9099';
    const projectId = process.env.PLAYWRIGHT_FIREBASE_PROJECT_ID || 'all-in-one-smu';
    const accountsEndpoint = `${authEmulatorHost.replace(/\/$/, '')}/emulator/v1/projects/${projectId}/accounts`;

    const maxMs = 10000; // wait up to 10s
    const start = Date.now();
    let found = false;
    while (Date.now() - start < maxMs && !found) {
      try {
        const r = await page.request.get(accountsEndpoint);
        if (r && r.ok()) {
          const body = await r.json();
          const users = body.users || body.accounts || [];
          if (users.some(u => u.email === email)) {
            found = true;
            break;
          }
        }
      } catch (e) {
        // ignore and retry
      }
      // small backoff
      // eslint-disable-next-line no-await-in-loop
      await new Promise((res) => setTimeout(res, 250));
    }
    if (!found) console.warn('[e2e] Auth emulator did not show the user within timeout; test may fail with auth/user-not-found');
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

export async function waitForAppReady(page, options = {}) {
  // Wait for basic network idle + a root element that looks like the app
  const timeout = options.timeout || 20000;
  try {
    await page.waitForLoadState('networkidle', { timeout });
  } catch (e) {
    // networkidle may time out but app may still be usable; continue
  }
  // Wait for the app root or a known nav element
  const rootSelectors = ['#app', 'nav', '[data-testid="app-root"]'];
  for (const sel of rootSelectors) {
    try {
      await page.waitForSelector(sel, { timeout: 3000 });
      break;
    } catch (err) {
      // continue trying other selectors
    }
  }
}

export async function getLocalStorageItem(page, key) {
  return await page.evaluate((k) => window.localStorage.getItem(k), key);
}

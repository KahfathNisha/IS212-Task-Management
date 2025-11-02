// Playwright ESM configuration — single, canonical config
import { defineConfig } from '@playwright/test';

// Allow CI to tell Playwright to use an already-running frontend/dev server
// (useful when CI starts servers itself, e.g. via firebase emulators:exec). If
// PLAYWRIGHT_USE_EXISTING is set, webServer won't be started by Playwright.
const useExistingServer = !!process.env.PLAYWRIGHT_USE_EXISTING;

const webServerConfig = useExistingServer ? undefined : {
  // Use the orchestration script which starts emulators + frontend dev server
  command: 'node ./scripts/start-with-emulators.cjs',
  // Playwright runs from the frontend folder
  cwd: process.cwd(),
  url: 'http://localhost:5173',
  timeout: 180000,
  // Always start a fresh dev server so Playwright can inject the emulator env vars
  reuseExistingServer: false,
  env: {
    // Provide Vite envs so the app will connect to the emulators when running under Playwright
    VITE_FIREBASE_API_KEY: 'fake-key',
    VITE_FIREBASE_PROJECT_ID: process.env.VITE_FIREBASE_PROJECT_ID || 'all-in-one-smu',
    VITE_FIREBASE_AUTH_DOMAIN: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost',
    VITE_FIREBASE_USE_EMULATOR: 'true',
    VITE_FIREBASE_AUTH_EMULATOR_HOST: process.env.VITE_FIREBASE_AUTH_EMULATOR_HOST || 'http://localhost:9099',
    VITE_FIRESTORE_EMULATOR_HOST: process.env.VITE_FIRESTORE_EMULATOR_HOST || 'localhost',
    VITE_FIRESTORE_EMULATOR_PORT: process.env.VITE_FIRESTORE_EMULATOR_PORT || '8080'
  }
};

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  // Run single worker to reduce flakiness when interacting with shared emulators/dev server
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: {
    // Use headless in CI, otherwise keep headed for local debugging
    headless: process.env.CI ? true : false,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    baseURL: 'http://localhost:5173',
  },
  webServer: webServerConfig
});

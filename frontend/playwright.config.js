// ESM Playwright config (project uses "type": "module")
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30000,
  expect: { timeout: 5000 },
  fullyParallel: false,
  use: {
    headless: true,
    viewport: { width: 1280, height: 720 },
    actionTimeout: 5000,
    baseURL: 'http://localhost:5173',
  },
  webServer: {
    command: 'npm run dev',
    cwd: process.cwd(),
    port: 5173,
    reuseExistingServer: true,
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
  }
});

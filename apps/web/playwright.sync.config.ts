import { defineConfig, devices } from '@playwright/test';

// Separate development server: exercises the storage modules directly, never the
// feature-flagged live Dropbox button or a user's existing browser profile.
export default defineConfig({
  testDir: './tests',
  testMatch: ['sync-local-browser.spec.ts', 'sync-auth-browser.spec.ts'],
  fullyParallel: true,
  // Worker-owned requests bypass Playwright routing. The real worker is checked
  // separately by playwright.sync-pwa.config.ts; provider mocks must stay isolated.
  use: { baseURL: 'http://127.0.0.1:4186', serviceWorkers: 'block' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command:
      'pnpm exec vite dev --config sync-test.vite.config.ts --host 127.0.0.1 --port 4186 --strictPort',
    url: 'http://127.0.0.1:4186',
    reuseExistingServer: false,
    env: {
      PUBLIC_DROPBOX_APP_KEY: 'browser-test-app-key',
      VITE_RELEASE_PROFILE: 'full',
      VITE_WORKSPACE_DROPBOX_SYNC: 'true',
      VITE_DROPBOX_SIGN_IN_ONLY: 'true',
    },
  },
});

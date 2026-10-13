import { defineConfig, devices } from '@playwright/test';

// Production worker/cache checks with synthetic credentials and disposable profiles.
// Unlike the provider-mock suite, service workers deliberately remain enabled.
export default defineConfig({
  testDir: './tests',
  testMatch: 'sync-pwa-browser.spec.ts',
  fullyParallel: true,
  workers: 2,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4187', serviceWorkers: 'allow' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4187 --strictPort',
    env: { PUBLIC_DROPBOX_APP_KEY: 'browser-test-app-key', VITE_RELEASE_PROFILE: 'full' },
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

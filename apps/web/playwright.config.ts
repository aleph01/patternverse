import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // Sync fixtures need their own synthetic app key and dedicated server/worker policy.
  testIgnore: ['sync-*-browser.spec.ts'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1',
    env: { VITE_RELEASE_PROFILE: 'full' },
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  },
});

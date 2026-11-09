import { defineConfig, devices } from '@playwright/test';

/** Run against the already built production artifact, without rebuilding other sessions' work. */
export default defineConfig({
  testDir: './tests',
  testMatch: ['offline.spec.ts', 'navigation.spec.ts'],
  workers: 1,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4193', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4193',
    url: 'http://127.0.0.1:4193',
    reuseExistingServer: false,
  },
});

import { defineConfig, devices } from '@playwright/test';

/** Verify the smaller public build separately from the full feature regression suite. */
export default defineConfig({
  testDir: './tests',
  testMatch: 'release-core.spec.ts',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4173' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm preview --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    env: { VITE_RELEASE_PROFILE: 'core' },
    reuseExistingServer: false,
  },
});

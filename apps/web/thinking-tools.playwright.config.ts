import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'thinking-tools.spec.ts',
  workers: 2,
  timeout: 60000,
  use: { baseURL: 'http://127.0.0.1:4189' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4189',
    url: 'http://127.0.0.1:4189',
    reuseExistingServer: false,
    env: { VITE_RELEASE_PROFILE: 'full' },
  },
});

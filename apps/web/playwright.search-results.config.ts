import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './verification',
  testMatch: 'library-search-results.spec.ts',
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4187', serviceWorkers: 'block' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4187 --strictPort',
    url: 'http://127.0.0.1:4187',
    env: { VITE_RELEASE_PROFILE: 'full' },
    reuseExistingServer: false,
  },
});

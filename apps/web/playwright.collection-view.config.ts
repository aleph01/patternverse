import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'collection-view.spec.ts',
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results/collection-view',
  use: {
    baseURL: 'http://127.0.0.1:4202',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
  timeout: 120000,
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4202 --strictPort',
    url: 'http://127.0.0.1:4202',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

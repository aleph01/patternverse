import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'identify-needs.spec.ts',
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results/identify-needs',
  timeout: 90000,
  use: { baseURL: 'http://127.0.0.1:4208', serviceWorkers: 'block', reducedMotion: 'reduce' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4208 --strictPort',
    url: 'http://127.0.0.1:4208',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

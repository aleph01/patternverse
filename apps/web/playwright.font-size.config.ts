import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'font-size.spec.ts',
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results/font-size',
  use: {
    baseURL: 'http://127.0.0.1:4201',
    serviceWorkers: 'block',
  },
  timeout: 120000,
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4201 --strictPort',
    url: 'http://127.0.0.1:4201',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

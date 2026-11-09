import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['article-reader-navigation.spec.ts', 'article-reader.spec.ts'],
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results/reader-navigation',
  use: {
    baseURL: 'http://127.0.0.1:4198',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  timeout: 60000,
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'compact-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4198 --strictPort',
    url: 'http://127.0.0.1:4198',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

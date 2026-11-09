import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'desktop-collection-list.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/desktop-collection-list',
  use: {
    baseURL: 'http://127.0.0.1:4203',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
  timeout: 120000,
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    {
      name: 'compact-desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1024, height: 900 } },
    },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4203 --strictPort',
    url: 'http://127.0.0.1:4203',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['component-gallery.spec.ts', 'function-reference.spec.ts'],
  workers: 2,
  timeout: 60000,
  reporter: 'list',
  outputDir: 'test-results/component-gallery',
  use: {
    baseURL: 'http://127.0.0.1:4237',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4237 --strictPort',
    url: 'http://127.0.0.1:4237',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

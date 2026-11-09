import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'pattern-language-docs.spec.ts',
  workers: 2,
  timeout: 60000,
  reporter: 'list',
  outputDir: 'test-results/pattern-language-docs',
  use: {
    baseURL: 'http://127.0.0.1:4235',
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
    permissions: ['clipboard-read', 'clipboard-write'],
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
    command: 'pnpm exec vite dev --host 127.0.0.1 --port 4235 --strictPort',
    url: 'http://127.0.0.1:4235',
    reuseExistingServer: false,
    timeout: 120000,
  },
});

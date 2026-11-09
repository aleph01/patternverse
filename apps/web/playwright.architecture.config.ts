import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'architecture.spec.ts',
  workers: 2,
  reporter: 'list',
  timeout: 120000,
  outputDir: 'test-results/architecture',
  use: {
    baseURL: 'http://127.0.0.1:4287',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4287',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '4287' },
  },
});

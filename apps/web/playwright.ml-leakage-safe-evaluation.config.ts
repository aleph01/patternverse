import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'ml-leakage-safe-evaluation.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/ml-leakage-safe-evaluation',
  use: { baseURL: 'http://127.0.0.1:42868', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:42868',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '42868' },
  },
});

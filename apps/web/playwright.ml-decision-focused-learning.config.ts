import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'ml-decision-focused-learning.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/ml-decision-focused-learning',
  use: { baseURL: 'http://127.0.0.1:42867', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:42867',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '42867' },
  },
});

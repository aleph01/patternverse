import { defineConfig, devices } from '@playwright/test';

// Verify the completed public build without staging routes during every test run.
export default defineConfig({
  testDir: './tests',
  testMatch: 'statistics.spec.ts',
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results/statistics',
  use: { baseURL: 'http://127.0.0.1:4192', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4192',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '4192' },
  },
});

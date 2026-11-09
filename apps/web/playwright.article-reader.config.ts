import { defineConfig, devices } from '@playwright/test';

/** Verify a fixed public build without rebuilding the editable workspace. */
export default defineConfig({
  testDir: './tests',
  testMatch: 'article-reader.spec.ts',
  workers: 2,
  reporter: 'list',
  outputDir: 'test-results/article-reader',
  use: { baseURL: 'http://127.0.0.1:4197', trace: 'retain-on-failure', reducedMotion: 'reduce' },
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
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4197',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '4197' },
  },
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    'dataviz-sort-order.spec.ts',
    'dataviz-initial-collection.spec.ts',
    'dataviz-expansion.spec.ts',
    'article-widgets.spec.ts',
  ],
  timeout: 90_000,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/dataviz',
  use: { baseURL: 'http://127.0.0.1:4206', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4206',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { PATTERNVERSE_TEST_PORT: '4206' },
  },
});

import { defineConfig, devices } from '@playwright/test';

const live = process.env.NVC_LIVE === 'true';
export default defineConfig({
  testDir: './tests',
  testMatch: 'nvc-publication.spec.ts',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.NVC_RESULTS ?? 'test-results/nvc/results.json' }],
  ],
  outputDir: process.env.NVC_OUTPUT ?? 'test-results/nvc',
  use: {
    baseURL: live ? 'https://patternverse.org' : 'http://127.0.0.1:4341',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: live
    ? undefined
    : {
        command: 'pnpm preview --host 127.0.0.1 --port 4341',
        url: 'http://127.0.0.1:4341',
        reuseExistingServer: false,
        timeout: 60_000,
      },
});

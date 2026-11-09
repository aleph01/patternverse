import { defineConfig, devices } from '@playwright/test';

const live = process.env.BOWEN_LIVE === 'true';
export default defineConfig({
  testDir: './tests',
  testMatch: 'bowen-publication.spec.ts',
  timeout: 60_000,
  expect: { timeout: 20_000 },
  workers: 2,
  reporter: [
    ['list'],
    ['json', { outputFile: process.env.BOWEN_RESULTS ?? 'test-results/bowen/results.json' }],
  ],
  outputDir: process.env.BOWEN_OUTPUT ?? 'test-results/bowen',
  use: {
    baseURL: live ? 'https://patternverse.org' : 'http://127.0.0.1:4339',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: live
    ? undefined
    : {
        command: 'pnpm preview --host 127.0.0.1 --port 4339',
        url: 'http://127.0.0.1:4339',
        reuseExistingServer: false,
        timeout: 60_000,
      },
});

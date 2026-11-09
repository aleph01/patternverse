import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'contribution-review.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/contribution-review',
  use: {
    baseURL: 'http://127.0.0.1:4199',
    trace: 'retain-on-failure',
    serviceWorkers: 'block',
    reducedMotion: 'reduce',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1100 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command:
        'pnpm --filter @patternverse/article-contributions exec wrangler dev --config test/preview.wrangler.jsonc --ip 127.0.0.1 --port 8793 --persist-to /private/tmp/pv-review-preview-state',
      url: 'http://127.0.0.1:8793/owner/contributions',
      reuseExistingServer: true,
    },
    {
      command: 'pnpm exec vite dev --host 127.0.0.1 --port 4199 --strictPort',
      url: 'http://127.0.0.1:4199',
      reuseExistingServer: true,
    },
  ],
});

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'sharing.spec.ts',
  workers: 2,
  timeout: 120000,
  reporter: 'list',
  outputDir: 'test-results/sharing',
  use: { baseURL: 'http://127.0.0.1:4208', serviceWorkers: 'block' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm build && pnpm exec vite preview --host 127.0.0.1 --port 4208 --strictPort',
    url: 'http://127.0.0.1:4208',
    reuseExistingServer: false,
    timeout: 240000,
  },
});

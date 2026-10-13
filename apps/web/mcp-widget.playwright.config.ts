import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'mcp-widget.spec.ts',
  use: { baseURL: 'http://127.0.0.1:4204' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite --config mcp-widget-test.vite.config.ts',
    url: 'http://127.0.0.1:4204',
    reuseExistingServer: !process.env.CI,
  },
});

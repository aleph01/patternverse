import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'bearings.spec.ts',
    'bearings-document.spec.ts',
    'bearings-suggestions.spec.ts',
    'bearings-ai.spec.ts',
    'bearings-header.spec.ts',
    'bearings-markdown.spec.ts',
    'bearings-minimap.spec.ts',
    'bearings-tree.spec.ts',
    'bearings-vim.spec.ts',
    'bearings-pattern-picker.spec.ts',
    'bearings-map.spec.ts',
    'situations.spec.ts',
  ],
  fullyParallel: false,
  workers: 2,
  retries: 0,
  use: { baseURL: 'http://127.0.0.1:4185', trace: 'retain-on-failure', actionTimeout: 10000 },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 4185',
    url: 'http://127.0.0.1:4185',
    reuseExistingServer: true,
  },
});

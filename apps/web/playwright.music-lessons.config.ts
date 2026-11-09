import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: 'guided-music-lessons.spec.ts',
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  timeout: 60_000,
  use: { baseURL: 'http://127.0.0.1:5198', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'SONGWRITING_PREVIEW_PORT=5198 node ../../docs/songwriting-course/preview.mjs',
    url: 'http://127.0.0.1:5198',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

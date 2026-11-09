import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'music-player-lab.spec.ts',
    'songwriting-player.spec.ts',
    'songwriting-chords.spec.ts',
  ],
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5196', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'SONGWRITING_PREVIEW_PORT=5196 node ../../docs/songwriting-course/preview.mjs',
    url: 'http://localhost:5196',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

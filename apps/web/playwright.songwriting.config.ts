import { defineConfig, devices } from '@playwright/test';

/** Local draft preview only. Normal production builds keep the course excluded. */
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'songwriting-course.spec.ts',
    'songwriting-player.spec.ts',
    'songwriting-chords.spec.ts',
    'songwriting-listening.spec.ts',
    'songwriting-listening-articles.spec.ts',
  ],
  fullyParallel: true,
  workers: 2,
  reporter: 'list',
  timeout: 60_000,
  use: { baseURL: 'http://localhost:5181', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node ../../docs/songwriting-course/preview.mjs',
    url: 'http://localhost:5181',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

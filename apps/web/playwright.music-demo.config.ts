import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: [
    'music-repertoire-demo.spec.ts',
    'music-chord-display.spec.ts',
    'music-form.spec.ts',
    'music-song-study.spec.ts',
    'music-real-song.spec.ts',
    'music-midi-song-study.spec.ts',
    'music-no-surprises.spec.ts',
    'music-songbook.spec.ts',
    'music-modular-layout.spec.ts',
    'music-recording-map.spec.ts',
  ],
  fullyParallel: true,
  workers: 2,
  timeout: 60_000,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:5197', trace: 'retain-on-failure' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm exec vite --config music-demo.vite.config.ts',
    url: 'http://127.0.0.1:5197',
    reuseExistingServer: true,
  },
});

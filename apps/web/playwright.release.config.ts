import { defineConfig, devices } from '@playwright/test';

/** Test the exact production artifact prepared by pnpm deploy:web --build-only. */
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'release-publication.spec.ts',
    'release-core.spec.ts',
    'home-shelves.spec.ts',
    'library-verse-navigation.spec.ts',
    'collection-gallery.spec.ts',
    'grouped-form-inputs.spec.ts',
    'multiple-practices.spec.ts',
  ],
  fullyParallel: true,
  // Advanced Mira exercise context belongs to the full-profile regression suite.
  grepInvert: /opens the specific linked practice in Mira/,
  workers: 2,
  reporter: 'list',
  use: { baseURL: 'http://127.0.0.1:4187', trace: 'retain-on-failure' },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1 --port 4187',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
  },
});

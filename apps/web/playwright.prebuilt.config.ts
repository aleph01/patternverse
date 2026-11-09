import { defineConfig } from '@playwright/test';
import full from './playwright.config';

/** CI already built the full profile; serve it without replacing its files. */
export default defineConfig({
  ...full,
  // Core-profile assertions and the historical fixed-inventory fixture have
  // dedicated configurations and cannot run against the full-profile build.
  testIgnore: [
    'sync-*-browser.spec.ts',
    'release-core.spec.ts',
    'site-improvements-release.spec.ts',
  ],
  webServer: {
    command: 'pnpm preview --host 127.0.0.1',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});

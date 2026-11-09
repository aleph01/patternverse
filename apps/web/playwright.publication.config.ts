import { defineConfig } from '@playwright/test';
import release from './playwright.release.config';

/** Test the core production files that CI will pass unchanged to the upload job. */
export default defineConfig({
  ...release,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4187',
    env: { PATTERNVERSE_TEST_PORT: '4187' },
    reuseExistingServer: false,
  },
});

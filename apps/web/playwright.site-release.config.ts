import release from './playwright.release.config';

/** Serve the fixed content-reviewed candidate; never rebuild the mixed working project. */
export default {
  ...release,
  testMatch: [...(release.testMatch as string[]), 'site-improvements-release.spec.ts'],
  outputDir: 'test-results/site-release',
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4187',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '4187' },
  },
};

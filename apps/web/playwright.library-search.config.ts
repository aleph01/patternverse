import config from './playwright.offline.config';

/** Search, offline, and release compatibility checks against an already built public artifact. */
export default {
  ...config,
  testMatch: ['library-search.spec.ts', 'offline.spec.ts', 'navigation.spec.ts'],
  outputDir: 'test-results/library-search',
  use: { ...config.use, baseURL: 'http://127.0.0.1:4195' },
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:4195',
    reuseExistingServer: false,
  },
};

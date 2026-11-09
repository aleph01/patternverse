import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: 'ml-knowledge-distillation.spec.ts',
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/ml-knowledge-distillation',
  use: { baseURL: 'http://127.0.0.1:42866', reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } },
    },
    { name: 'phone', use: { ...devices['Pixel 7'] } },
  ],
  webServer: {
    command: 'node tests/helpers/static-build-server.mjs',
    url: 'http://127.0.0.1:42866',
    reuseExistingServer: false,
    env: { PATTERNVERSE_TEST_PORT: '42866' },
  },
});

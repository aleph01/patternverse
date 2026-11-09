import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

// These publication tests render Markdown and inspect the worker contract; they
// do not mount components or need the testing-library component setup.
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: [
      'src/lib/server/bowen-content.test.ts',
      'src/lib/server/transactional-analysis-content.test.ts',
      'src/lib/client/pwa.test.ts',
    ],
  },
});

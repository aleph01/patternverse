import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

const contentRoot = resolve(process.cwd(), '../../content');
const manifestPath = resolve(process.cwd(), '../../patternverse.yaml');

export default defineConfig({
  plugins: [
    {
      name: 'patternverse-content-reload',
      configureServer(server) {
        server.watcher.add([contentRoot, manifestPath]);
        server.watcher.on('all', (_event, path) => {
          if (path === manifestPath || path.startsWith(contentRoot)) {
            server.ws.send({ type: 'full-reload' });
          }
        });
      },
    },
    sveltekit(),
    svelteTesting(),
  ],
  test: {
    include: ['src/**/*.test.ts'],
  },
});

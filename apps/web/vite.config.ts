import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';
import { resolve } from 'node:path';
import { searchForWorkspaceRoot } from 'vite';
import { defineConfig } from 'vitest/config';

const contentRoot = resolve(process.cwd(), '../../content');
const manifestPath = resolve(process.cwd(), '../../patternverse.yaml');

export default defineConfig({
  server: {
    // Article HTML is imported as inert text from the shared content directory.
    fs: { allow: [searchForWorkspaceRoot(process.cwd()), contentRoot] },
    proxy: {
      '/api/contribute': { target: 'http://127.0.0.1:8792' },
      '/api/article-contributions': { target: 'http://127.0.0.1:8793' },
      '/owner/contributions': { target: 'http://127.0.0.1:8793' },
    },
  },
  optimizeDeps: { include: ['@tonejs/midi', 'vexflow'] },
  ssr: { noExternal: ['@lucide/svelte'] },
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

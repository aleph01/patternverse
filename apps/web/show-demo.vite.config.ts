import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Local authoring fixture, isolated from public SvelteKit routes and production builds.
export default defineConfig({
  root: fileURLToPath(new URL('./src/internal/show-demo/', import.meta.url)),
  plugins: [svelte({ configFile: false, preprocess: vitePreprocess() })],
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib/', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 4203, strictPort: true },
  build: { outDir: fileURLToPath(new URL('../../.local/show-demo/', import.meta.url)) },
});

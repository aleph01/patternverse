import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { patternMarkStudioServer } from './src/internal/illustration-studio/studio-server.ts';

// Independent local entry point: never imported by SvelteKit's public routes or build.
export default defineConfig({
  root: fileURLToPath(new URL('./src/internal/illustration-studio/', import.meta.url)),
  plugins: [
    svelte({ configFile: false, preprocess: vitePreprocess() }),
    patternMarkStudioServer(
      fileURLToPath(new URL('../../', import.meta.url)),
      fileURLToPath(
        new URL('./src/lib/illustrations/pattern-icon-overrides.json', import.meta.url),
      ),
    ),
  ],
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib/', import.meta.url)) } },
  server: { host: '127.0.0.1', port: 4201, strictPort: true },
  build: { outDir: fileURLToPath(new URL('../../.local/illustration-studio/', import.meta.url)) },
});

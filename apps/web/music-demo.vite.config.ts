import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { musicDemoServer } from './src/internal/music-demo/demo-server';

// Separate local entry point; neither this page nor private MIDI enters the public build.
export default defineConfig({
  root: fileURLToPath(new URL('./src/internal/music-demo/', import.meta.url)),
  publicDir: fileURLToPath(new URL('./static/', import.meta.url)),
  plugins: [
    svelte({ configFile: false, preprocess: vitePreprocess() }),
    musicDemoServer(
      fileURLToPath(new URL('../../', import.meta.url)),
      process.env.MUSIC_DEMO_SUPERSTITION_MIDI ??
        fileURLToPath(
          new URL('../../.local/music-repertoire/wonder-superstition-demo.mid', import.meta.url),
        ),
      process.env.MUSIC_DEMO_MIDI_DIR,
    ),
  ],
  resolve: {
    alias: {
      $lib: fileURLToPath(new URL('./src/lib/', import.meta.url)),
      '$app/paths': fileURLToPath(new URL('./src/internal/music-demo/paths.ts', import.meta.url)),
    },
  },
  optimizeDeps: { include: ['@tonejs/midi', 'vexflow'] },
  server: { host: '127.0.0.1', port: 5197, strictPort: true },
  build: { outDir: fileURLToPath(new URL('../../.local/music-demo/', import.meta.url)) },
});

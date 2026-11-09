import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  root: fileURLToPath(new URL('./src/internal/mcp-widget/', import.meta.url)),
  base: '/mcp/ui/',
  publicDir: false,
  plugins: [svelte({ configFile: false, preprocess: vitePreprocess() })],
  resolve: {
    alias: {
      '$app/paths': fileURLToPath(new URL('./src/internal/mcp-widget/paths.ts', import.meta.url)),
      '$lib/article-widgets/mount': fileURLToPath(
        new URL('./src/internal/mcp-widget/article-widgets.ts', import.meta.url),
      ),
      $lib: fileURLToPath(new URL('./src/lib/', import.meta.url)),
    },
  },
  build: {
    outDir: fileURLToPath(new URL('../mcp/dist/assets/mcp/ui/', import.meta.url)),
    emptyOutDir: true,
    assetsInlineLimit: 0,
    rolldownOptions: { output: { codeSplitting: false } },
  },
});

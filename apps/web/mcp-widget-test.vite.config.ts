import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

// Local host fixture only, never part of website or Worker deployment.
export default defineConfig({
  root: fileURLToPath(new URL('./src/internal/mcp-widget-test/', import.meta.url)),
  publicDir: fileURLToPath(new URL('../mcp/dist/assets/', import.meta.url)),
  server: { host: '127.0.0.1', port: 4204, strictPort: true, cors: true },
});

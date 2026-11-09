import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';

const directory = resolve(process.env.PATTERNVERSE_TEST_BUILD_DIR ?? 'build');
const types = {
  '.html': 'text/html',
  '.htm': 'text/html',
  '.json': 'application/json',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};
createServer(async (request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  response.setHeader('Cache-Control', 'public, max-age=0');
  for (const file of [path === '/' ? '/index.html' : path, `${path}.html`]) {
    const absolute = resolve(directory, `.${decodeURI(file)}`);
    if (!absolute.startsWith(`${directory}/`)) break;
    try {
      const bytes = await readFile(absolute);
      response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
      response.end(bytes);
      return;
    } catch {
      /* Try the adapter's .html path. */
    }
  }
  response.writeHead(404).end('Not found');
}).listen(Number(process.env.PATTERNVERSE_TEST_PORT ?? 4195), '127.0.0.1');

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import type { AddressInfo } from 'node:net';
import { publicBuildDirectory } from './public-build';

/** Serve the unchanged production artifact with controllable navigation responses. */
export async function navigationServer(worker?: Buffer | string) {
  const directory = publicBuildDirectory;
  let held: Promise<void> | undefined;
  let release = () => {};
  let arrivals = 0;
  const requests: { pathname: string; search: string; mode?: string }[] = [];
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.wasm': 'application/wasm',
    '.webmanifest': 'application/manifest+json',
  };
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    requests.push({
      pathname: url.pathname,
      search: url.search,
      mode: request.headers['sec-fetch-mode'] as string,
    });
    if (held && (url.pathname === '/library' || url.pathname === '/library/__data.json')) {
      arrivals++;
      await held;
    }
    response.setHeader('Cache-Control', 'public, max-age=0');
    if (url.pathname === '/service-worker.js' && worker) {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(worker);
      return;
    }
    for (const file of [
      url.pathname === '/' ? '/index.html' : url.pathname,
      `${url.pathname}.html`,
    ]) {
      const absolute = resolve(directory, `.${decodeURI(file)}`);
      if (!absolute.startsWith(`${directory}/`)) break;
      try {
        const bytes = await readFile(absolute);
        response.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
        response.end(bytes);
        return;
      } catch {
        /* Try the static adapter's .html form. */
      }
    }
    response.writeHead(404).end('Not found');
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    requests,
    get arrivals() {
      return arrivals;
    },
    hold() {
      held = new Promise<void>((resolve) => {
        release = resolve;
      });
    },
    release() {
      held = undefined;
      release();
    },
    async close() {
      held = undefined;
      release();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

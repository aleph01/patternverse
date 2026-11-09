import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, resolve } from 'node:path';
import type { AddressInfo } from 'node:net';
import { publicBuildDirectory, publicBuildFile } from './helpers/public-build';

test('a cached old update script cannot trap a refreshed tab or replace another editing tab', async ({
  page,
  context,
}) => {
  const current = JSON.parse(await readFile(publicBuildFile('_app/version.json'), 'utf8')).version;
  const worker = await readFile(publicBuildFile('service-worker.js'), 'utf8');
  const olderWorker = worker.replaceAll(current, 'previous');
  const legacy = `<!doctype html><title>Existing session</title><input aria-label="Draft"><script>navigator.serviceWorker.register('/service-worker.js').then(()=>navigator.serviceWorker.ready).then(()=>navigator.serviceWorker.controller?.postMessage({type:'CLIENT_VERSION',version:'previous'}));</script>`;
  const mime: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.wasm': 'application/wasm',
  };
  let freshWorkerRequests = 0;
  const server = createServer(async (request, response) => {
    const url = new URL(request.url!, 'http://localhost');
    response.setHeader('Cache-Control', 'public, max-age=14400');
    if (url.pathname === '/legacy') {
      response.setHeader('Content-Type', 'text/html');
      response.end(legacy);
      return;
    }
    if (url.pathname === '/service-worker.js') {
      const fresh = url.searchParams.get('version') === current;
      if (fresh) freshWorkerRequests++;
      response.setHeader('Content-Type', 'text/javascript');
      response.end(fresh ? worker : olderWorker);
      return;
    }
    for (const file of [
      url.pathname === '/' ? '/index.html' : url.pathname,
      `${url.pathname}.html`,
    ]) {
      const path = resolve(publicBuildDirectory, `.${decodeURI(file)}`);
      if (!path.startsWith(publicBuildDirectory + '/')) break;
      try {
        const bytes = await readFile(path);
        response.setHeader('Content-Type', mime[extname(file)] ?? 'application/octet-stream');
        response.end(bytes);
        return;
      } catch {
        /* Try the static adapter's HTML path. */
      }
    }
    response.writeHead(404).end('Not found');
  });
  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await page.goto(origin + '/legacy');
    await page.evaluate(() => navigator.serviceWorker.ready);
    await expect
      .poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller)))
      .toBe(true);
    const editor = await context.newPage();
    await editor.goto(origin + '/legacy');
    await editor.getByRole('textbox', { name: 'Draft' }).fill('An unsaved idea');
    await editor.evaluate(() => {
      (window as typeof window & { editingSession?: boolean }).editingSession = true;
    });
    await page.goto(origin + '/collection/games-people-play');
    await expect
      .poll(() =>
        page.evaluate(() =>
          navigator.serviceWorker.getRegistration().then((r) => r?.active?.scriptURL),
        ),
      )
      .toBe(origin + '/service-worker.js?version=' + current);
    expect(freshWorkerRequests).toBeGreaterThan(0);
    await expect(editor.getByRole('textbox', { name: 'Draft' })).toHaveValue('An unsaved idea');
    expect(
      await editor.evaluate(
        () => (window as typeof window & { editingSession?: boolean }).editingSession,
      ),
    ).toBe(true);
    await page.locator('.markdown-body a[href="/pattern/ta-why-dont-you-yes-but"]').first().click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Why Don’t You—Yes But');
    await page.reload();
    await expect(page.locator('.markdown-body')).toContainText(
      'The game name must never become a shortcut',
    );
    await editor.close();
  } finally {
    server.closeAllConnections();
    await new Promise<void>((done) => server.close(() => done()));
  }
});

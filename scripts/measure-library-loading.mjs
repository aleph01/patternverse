// Compare static production builds with three cold loads per navigation mode.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { gzipSync } from 'node:zlib';
const fromWeb = createRequire(new URL('../apps/web/package.json', import.meta.url));
const { chromium, expect } = fromWeb('@playwright/test');
(async () => {
  if (!process.argv[2] || !process.argv[3])
    throw new Error(
      'Usage: node scripts/measure-library-loading.mjs <build-directory> <output-json>',
    );
  const directory = resolve(process.argv[2]),
    output = resolve(process.argv[3]);
  const types = {
    '.html': 'text/html',
    '.json': 'application/json',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.svg': 'image/svg+xml',
    '.wasm': 'application/wasm',
    '.webmanifest': 'application/manifest+json',
    '.png': 'image/png',
    '.webp': 'image/webp',
  };
  const server = createServer(async (req, res) => {
    const path = new URL(req.url, 'http://localhost').pathname;
    for (const file of [path === '/' ? '/index.html' : path, path + '.html'])
      try {
        const absolute = resolve(directory, '.' + decodeURI(file));
        if (!absolute.startsWith(directory + '/')) break;
        let bytes = await readFile(absolute);
        res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
        if (/html|json|js|css|svg|webmanifest/.test(extname(file))) {
          bytes = gzipSync(bytes);
          res.setHeader('Content-Encoding', 'gzip');
        }
        res.setHeader('Content-Length', bytes.length);
        res.end(bytes);
        return;
      } catch {
        /* Try the adapter's .html form. */
      }
    res.writeHead(404).end();
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch();
  const samples = [];
  try {
    for (const mode of ['direct', 'link'])
      for (let i = 0; i < 3; i++) {
        const context = await browser.newContext({ serviceWorkers: 'block' });
        const page = await context.newPage();
        const cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable');
        await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', {
          offline: false,
          latency: 40,
          downloadThroughput: 500000,
          uploadThroughput: 500000,
        });
        let active = false;
        const requests = new Map(),
          transfers = [];
        cdp.on('Network.requestWillBeSent', (e) => {
          if (active) requests.set(e.requestId, { url: e.request.url, type: e.type });
        });
        cdp.on('Network.loadingFinished', (e) => {
          if (requests.has(e.requestId))
            transfers.push({ ...requests.get(e.requestId), bytes: e.encodedDataLength });
        });
        if (mode === 'link') {
          await page.goto(origin + '/pattern/creative-reframing');
          await page.waitForLoadState('networkidle');
        }
        active = true;
        const start = Date.now();
        if (mode === 'direct')
          await page.goto(origin + '/library', { waitUntil: 'domcontentloaded' });
        else {
          const link = page
            .getByRole('navigation', { name: 'Main navigation' })
            .getByRole('link', { name: 'library', exact: true });
          await link.hover();
          await link.click();
        }
        await expect(page.getByRole('button', { name: 'Explore', exact: true })).toBeEnabled();
        await expect(page.locator('#library').getByRole('link').first()).toBeVisible();
        const usableMs = Date.now() - start;
        await page.waitForLoadState('networkidle');
        const beforeSearch = transfers.slice();
        const search = Date.now();
        await page.getByRole('searchbox').fill('creative reframing');
        await expect(page.locator('#library').getByText('for “creative reframing”')).toBeVisible();
        await expect(
          page.locator('#library').getByText('Creative Reframing', { exact: true }).first(),
        ).toBeVisible();
        const status = page.getByRole('status').filter({ hasText: /full library search/i });
        await expect(status).toHaveCount(0);
        const firstSearchMs = Date.now() - search;
        const repeat = Date.now();
        await page.getByRole('searchbox').fill('creative');
        await expect(page.locator('#library').getByText('for “creative”')).toBeVisible();
        const repeatSearchMs = Date.now() - repeat;
        await page.waitForLoadState('networkidle');
        samples.push({
          mode,
          iteration: i,
          usableMs,
          firstSearchMs,
          repeatSearchMs,
          beforeSearch,
          transfers,
        });
        await context.close();
      }
    await writeFile(
      output,
      JSON.stringify(
        {
          conditions: {
            browserVersion: browser.version(),
            latencyMs: 40,
            downloadBytesPerSecond: 500000,
            compression: 'gzip',
            serviceWorkers: 'blocked',
            httpCache: 'disabled',
          },
          samples,
        },
        null,
        2,
      ),
    );
    console.log(
      samples.map(({ mode, usableMs, firstSearchMs, repeatSearchMs, beforeSearch, transfers }) => ({
        mode,
        usableMs,
        firstSearchMs,
        repeatSearchMs,
        initialBytes: beforeSearch.reduce((s, r) => s + r.bytes, 0),
        totalBytes: transfers.reduce((s, r) => s + r.bytes, 0),
      })),
    );
  } finally {
    await browser.close();
    server.closeAllConnections();
    await new Promise((r) => server.close(r));
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

import { searchLibrary, selectLibraryScope } from './helpers/library';
import { expect, test } from '@playwright/test';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import type { AddressInfo } from 'node:net';
import { publicBuildFile } from './helpers/public-build';

const waitForOfflineControl = async (page: import('@playwright/test').Page): Promise<void> => {
  await page.evaluate(
    () =>
      new Promise<void>((resolve, reject) => {
        const timeout = window.setTimeout(
          () => reject(new Error('The Patternverse service worker did not take control.')),
          10_000,
        );
        const finish = () => {
          window.clearTimeout(timeout);
          resolve();
        };

        void navigator.serviceWorker.ready.then(() => {
          if (navigator.serviceWorker.controller) {
            finish();
            return;
          }
          navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true });
        });
      }),
  );
};

test('publishes an installable manifest and versioned service worker', async ({ page }) => {
  const manifestResponse = await page.request.get('/manifest.webmanifest');
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest).toMatchObject({
    name: 'Patternverse',
    display: 'standalone',
    start_url: './',
  });
  expect(manifest.icons).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
      expect.objectContaining({ sizes: '512x512', type: 'image/png' }),
      expect.objectContaining({ purpose: 'maskable' }),
    ]),
  );

  const workerResponse = await page.request.get('/service-worker.js');
  expect(workerResponse.ok()).toBe(true);
  expect(await workerResponse.text()).toContain('SKIP_WAITING');

  await page.goto('/');
  await waitForOfflineControl(page);
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    './manifest.webmanifest',
  );
  await expect(page.locator('footer')).not.toContainText('available offline');
  await expect(page.locator('footer')).not.toContainText('local browser');
  await expect(page.getByRole('button', { name: 'Download library for offline use' })).toHaveCount(
    0,
  );
});

test('keeps offline controls in workspace settings in an installed PWA context', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const matchMedia = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const result = matchMedia(query);
      if (query === '(display-mode: standalone)') {
        Object.defineProperty(result, 'matches', { value: true });
      }
      return result;
    };
  });
  await page.goto('/');
  await waitForOfflineControl(page);
  await expect(page.locator('footer')).not.toContainText('offline');
  await expect(page.getByRole('button', { name: 'Download library for offline use' })).toHaveCount(
    0,
  );
  await page.goto('/my?pane=settings');
  await expect(page.getByRole('heading', { name: 'Offline access' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Download library for offline use' }),
  ).toBeVisible();
});

test('refreshes cached pages while online without losing offline navigation', async ({
  context,
  page,
}) => {
  await page.goto('/');
  await waitForOfflineControl(page);

  await page.evaluate(async () => {
    const cacheName = (await caches.keys()).find((name) =>
      name.startsWith('patternverse-precache-'),
    );
    if (!cacheName) throw new Error('Patternverse precache was not created.');
    const cache = await caches.open(cacheName);
    await cache.put(
      new Request(new URL('/', location.origin)),
      new Response('<!doctype html><title>Old page</title><h1>Stale homepage</h1>', {
        headers: { 'Content-Type': 'text/html' },
      }),
    );
  });

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Stale homepage' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('library');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('library');
});

test('keeps Commons search, reading, and personal editing available offline', async ({
  context,
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Offline Field Note');
  await page
    .getByLabel('In one sentence')
    .fill('A personal note created before losing the connection.');
  await page.locator('.novel-prose').fill('Keep this close when the network disappears.');
  await page.getByRole('searchbox', { name: 'Find Verses', exact: true }).fill('Learning');
  await page.getByRole('button', { name: 'Add Learning', exact: true }).click();
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Offline Field Note” as draft.')).toBeVisible();

  await page.goto('/library');
  await waitForOfflineControl(page);
  await searchLibrary(page, 'offline field note');
  await expect(page.locator('#library')).toContainText('Offline Field Note');

  await page.goto('/my?pane=settings');
  await page.getByRole('button', { name: 'Download library for offline use' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Library available offline' }),
  ).toBeVisible({ timeout: 60_000 });

  await page.goto('/library');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Offline.', { exact: true })).toBeVisible();

  await selectLibraryScope(page, 'explore');
  await searchLibrary(page, 'creative reframing');
  await expect(page.locator('#library')).toContainText('Creative Reframing');
  await selectLibraryScope(page, 'saved');
  await searchLibrary(page, 'offline field note');
  await expect(page.locator('#library')).toContainText('Offline Field Note');

  await page.goto('/pattern/creative-reframing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();

  await page.goto('/editor?id=offline-field-note', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Offline Field Note');
  await page.getByLabel('In one sentence').fill('Edited safely while Patternverse is offline.');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Offline Field Note” as draft.')).toBeVisible();
});

test('installs a single fallback under throttling and reopens the first visited article offline', async ({
  context,
  page,
}) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 40,
    downloadThroughput: 500_000,
    uploadThroughput: 500_000,
  });
  await page.goto('/pattern/creative-reframing');
  await waitForOfflineControl(page);
  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const names = await caches.keys();
        const precache = await caches.open(
          names.find((name) => name.startsWith('patternverse-precache-'))!,
        );
        const install = (await precache.keys())
          .map((request) => new URL(request.url).pathname)
          .filter((path) => !path.startsWith('/__navigation_'));
        const runtime = await caches.open(
          names.find((name) => name.startsWith('patternverse-runtime-'))!,
        );
        const pageData = await runtime.match(
          new URL('/pattern/creative-reframing/__data.json', location.origin),
        );
        const html = await runtime.match(new URL('/pattern/creative-reframing', location.origin));
        return { install, ready: Boolean(html && pageData) };
      }),
    )
    .toEqual({ install: ['/offline.html'], ready: true });
  await cdp.send('Network.disable');
  await context.setOffline(true);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();
  await expect(page.getByText('Offline.', { exact: true })).toBeVisible();
  // Missing content opens the standalone fallback at its own URL, so relative links work.
  await page.goto('/pattern/this-was-never-cached', { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/offline.html$/);
  await expect(page.getByRole('heading', { name: "You're offline." })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Library', exact: true })).toHaveAttribute(
    'href',
    './library',
  );
});

test('pauses and resumes an explicitly requested full library download', async ({
  context,
  page,
}) => {
  test.setTimeout(90_000);
  await page.goto('/my?pane=settings');
  await waitForOfflineControl(page);
  // An offline request pauses after the first failed pair, without a retry loop.
  await context.setOffline(true);
  await page.evaluate(() =>
    navigator.serviceWorker.controller!.postMessage({ type: 'DOWNLOAD_OFFLINE' }),
  );
  await expect(page.getByRole('status').filter({ hasText: 'Download paused.' })).toBeVisible();
  await context.setOffline(false);
  await expect(page.getByRole('button', { name: 'Resume offline download' })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume offline download' }).click();
  await expect(
    page.getByRole('status').filter({ hasText: 'Library available offline' }),
  ).toBeVisible({ timeout: 60_000 });
  await page.reload();
  await expect(
    page.getByRole('status').filter({ hasText: 'Library available offline' }),
  ).toBeVisible();
  await context.setOffline(true);
  await page.goto('/pattern/creative-reframing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();
  // No search was used before this explicit download. Its completion includes the deferred corpus.
  await page.goto('/library', { waitUntil: 'domcontentloaded' });
  await searchLibrary(page, 'creative reframing');
  await expect(
    page.locator('#library').getByText('Creative Reframing', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /full library search/i })).toHaveCount(0);
});

test('activates an update without reloading and keeps another open tab’s old chunks until it closes', async ({
  context,
  page,
}) => {
  let updated = false;
  const worker = await readFile(publicBuildFile('service-worker.js'));
  const fallback = await readFile(publicBuildFile('offline.html'));
  const previousWorker = `
    self.addEventListener('install', event => event.waitUntil((async () => {
      const cache = await caches.open('patternverse-precache-previous');
      await cache.put('/_app/immutable/previous.js', new Response('previous dependency'));
      await cache.put('/library/__data.json', new Response('previous data'));
    })()));
    self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
  `;
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/service-worker.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(updated ? worker : previousWorker);
    } else if (request.url === '/offline.html') {
      response.setHeader('Content-Type', 'text/html');
      response.end(fallback);
    } else if (request.url === '/') {
      response.setHeader('Content-Type', 'text/html');
      response.end('<!doctype html><title>Update fixture</title><h1>Open editing session</h1>');
    } else {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.register('/service-worker.js'));
    await waitForOfflineControl(page);
    const other = await context.newPage();
    await other.goto(origin);
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 80,
      downloadThroughput: 500_000,
      uploadThroughput: 500_000,
    });
    await page.evaluate(() => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        document.documentElement.dataset.controllerChanged = 'true';
      }, { once: true });
    });
    updated = true;
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())!.update());
    await expect(page.locator('html')).toHaveAttribute('data-controller-changed', 'true');
    await expect(page.getByRole('heading', { name: 'Open editing session' })).toBeVisible();
    expect(await page.evaluate(() => caches.has('patternverse-precache-previous'))).toBe(true);
    await cdp.send('Network.disable');
    await context.setOffline(true);
    expect(
      await other.evaluate(async () => (await fetch('/_app/immutable/previous.js')).text()),
    ).toBe('previous dependency');
    // Stable page-data URLs must not fall back to the retired snapshot.
    expect(
      await other.evaluate(async () => {
        try {
          return (await fetch('/library/__data.json')).status === 503;
        } catch {
          return true;
        }
      }),
    ).toBe(true);
    await other.close();
    await context.setOffline(false);
    await page.reload();
    await page.evaluate(() =>
      navigator.serviceWorker.controller!.postMessage({ type: 'OFFLINE_STATUS' }),
    );
    await expect
      .poll(() => page.evaluate(() => caches.has('patternverse-precache-previous')))
      .toBe(false);
  } finally {
    await context.setOffline(false);
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

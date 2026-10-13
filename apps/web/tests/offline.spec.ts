import { expect, test } from '@playwright/test';

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
});

test('shows offline availability in an installed PWA context', async ({ page }) => {
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
  await expect(page.locator('footer')).toContainText('available offline');
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
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('about');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('navigation', { name: 'Main navigation' })).toContainText('about');
});

test('keeps Commons search, reading, and personal editing available offline', async ({
  context,
  page,
}) => {
  await page.goto('/editor?type=pattern');
  await page.getByLabel('Title', { exact: true }).fill('Offline Field Note');
  await page.getByLabel('Summary').fill('A personal note created before losing the connection.');
  await page.locator('.novel-prose').fill('Keep this close when the network disappears.');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Offline Field Note” as draft.')).toBeVisible();

  await page.goto('/library');
  await waitForOfflineControl(page);
  await page.getByRole('searchbox').fill('offline field note');
  await expect(page.locator('#library')).toContainText('Offline Field Note');

  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Offline.', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Explore', exact: true }).click();
  await page.getByRole('searchbox').fill('working memory');
  await expect(page.locator('#library')).toContainText('Working Memory');
  await page.getByRole('searchbox').fill('offline field note');
  await expect(page.locator('#library')).toContainText('Offline Field Note');

  await page.goto('/pattern/creative-reframing', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { level: 1, name: 'Creative Reframing' })).toBeVisible();

  await page.goto('/editor?id=offline-field-note', { waitUntil: 'domcontentloaded' });
  await expect(page.getByLabel('Title', { exact: true })).toHaveValue('Offline Field Note');
  await page.getByLabel('Summary').fill('Edited safely while Patternverse is offline.');
  await page.getByRole('button', { name: 'Save', exact: true }).first().click();
  await expect(page.getByText('Saved “Offline Field Note” as draft.')).toBeVisible();
});

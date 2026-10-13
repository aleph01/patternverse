import { expect, test, type Page } from '@playwright/test';
import { createServer, request } from 'node:http';

async function ready(page: Page, url = '/my') {
  await page.goto(url);
  await expect(page.getByText(/^No personal verses yet\./)).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller), { timeout: 30000 })
    .toBe(true);
}

// A real transport outage still reaches WebKit's service-worker fetch handler.
// Playwright setOffline(true) instead produces internal errors in this WebKit test browser.
const outageTest = test.extend<{
  outageServer: { origin: string; disconnect: () => void };
}>({
  outageServer: async ({ baseURL }, use) => {
    let online = true;
    const server = createServer((incoming, outgoing) => {
      if (!online) {
        incoming.socket.destroy();
        return;
      }
      const upstream = request(
        new URL(incoming.url!, baseURL!),
        { method: incoming.method, headers: incoming.headers },
        (response) => {
          outgoing.writeHead(response.statusCode!, response.headers);
          response.pipe(outgoing);
        },
      );
      upstream.on('error', () => outgoing.destroy());
      incoming.on('error', () => upstream.destroy());
      incoming.pipe(upstream);
    });
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', resolve);
      });
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Missing local test port');
      await use({
        origin: `http://127.0.0.1:${address.port}`,
        disconnect: () => {
          online = false;
          server.closeAllConnections();
        },
      });
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  },
});
async function cacheUrls(page: Page) {
  return page.evaluate(async () =>
    (
      await Promise.all(
        (await caches.keys()).map(async (name) =>
          (await (await caches.open(name)).keys()).map((request) => request.url),
        ),
      )
    ).flat(),
  );
}

test('rejects unsolicited Dropbox callbacks under the production worker without caching credentials', async ({
  page,
  context,
}) => {
  const external: string[] = [];
  context.on('request', (request) => {
    if (request.url().includes('dropboxapi.com')) external.push(new URL(request.url()).pathname);
  });
  await ready(page);
  await page.goto(
    '/auth/dropbox/callback?code=pwa-sensitive-test-code&state=pwa-sensitive-test-state',
  );
  await expect(
    page.getByRole('heading', { name: 'The Dropbox authorization response is incomplete.' }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/auth\/dropbox\/callback$/);
  const urls = await cacheUrls(page);
  expect(urls.some((url) => url.includes('/auth/') || url.includes('pwa-sensitive-test'))).toBe(
    false,
  );
  expect(
    await page.evaluate(() => sessionStorage.getItem('patternverse:dropbox:oauth-flow:v1')),
  ).toBeNull();
  expect(
    await page.evaluate(() => sessionStorage.getItem('patternverse:dropbox:connection:v1')),
  ).toBeNull();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'The Dropbox authorization response is incomplete.' }),
  ).toBeVisible();
  expect(external).toEqual([]);
});

outageTest(
  'keeps workspace navigation available offline in a simulated standalone display',
  async ({ page, context, browserName, outageServer }) => {
    // Display-mode emulation is not an installed iOS PWA or OS-level OAuth handoff.
    await page.addInitScript(() => {
      const original = window.matchMedia.bind(window);
      window.matchMedia = (query) => {
        const result = original(query);
        if (query === '(display-mode: standalone)')
          Object.defineProperty(result, 'matches', { value: true });
        return result;
      };
    });
    await ready(page, `${outageServer.origin}/my`);
    await expect(page.locator('footer')).toContainText('available offline');
    // Prime the actual runtime page cache; do not fake a worker or cache response.
    await page.reload();
    await expect(page.getByText(/^No personal verses yet\./)).toBeVisible();
    const urls = await cacheUrls(page);
    expect(urls.some((url) => new URL(url).pathname === '/my')).toBe(true);
    outageServer.disconnect();
    if (browserName === 'chromium') await context.setOffline(true);
    // No fake cache responses: every network request now fails at the local server.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'your workspace.', exact: true })).toBeVisible();
    await expect(page.getByText(/^No personal verses yet\./)).toBeVisible();
    await page.getByRole('button', { name: 'Sync & backup', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'keep your work close.', exact: true }),
    ).toBeVisible();
  },
);

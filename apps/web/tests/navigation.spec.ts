import { openLibrarySearch, searchLibrary } from './helpers/library';
import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { navigationServer } from './helpers/navigation-server';
import { publicBuildFile } from './helpers/public-build';

async function controlled(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) =>
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), {
          once: true,
        }),
      );
  });
}

test('cached documents and page data finish while the origin response is held', async ({
  page,
}) => {
  const server = await navigationServer();
  try {
    await page.goto(`${server.origin}/library`);
    await controlled(page);
    await page.evaluate(async () => {
      await fetch('/library');
      await fetch('/library/__data.json');
    });
    await page.waitForLoadState('networkidle');
    server.hold();
    // This explicit bypass proves that the origin is blocked, independently of SW hits.
    await page.evaluate(() => {
      (window as typeof window & { bypass?: Promise<Response | undefined> }).bypass = fetch(
        '/library/__data.json',
        { cache: 'no-store' },
      ).catch(() => undefined);
    });
    await expect.poll(() => server.arrivals).toBe(1);
    const start = Date.now();
    const cached = await page.evaluate(async () => {
      const response = await fetch('/library/__data.json');
      return { status: response.status, type: (await response.json()).type };
    });
    const dataMs = Date.now() - start;
    expect(cached).toEqual({ status: 200, type: 'data' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Browse the library' })).toBeVisible();
    expect(server.arrivals).toBe(1);
    test.info().annotations.push({
      type: 'measurement',
      description: `Cached data fetch: ${dataMs} ms; data plus document reload: ${Date.now() - start} ms; origin bypass still held.`,
    });
    server.release();
  } finally {
    await server.close();
  }
});

test('the previous network-first worker waits for the same held origin response', async ({
  page,
}) => {
  test.skip(
    !process.env.NAVIGATION_BASELINE_WORKER,
    'Set NAVIGATION_BASELINE_WORKER to a previous built worker for an actual before/after comparison.',
  );
  const server = await navigationServer(await readFile(process.env.NAVIGATION_BASELINE_WORKER!));
  try {
    await page.goto(`${server.origin}/library`);
    await controlled(page);
    await page.evaluate(async () => {
      await fetch('/library/__data.json');
    });
    await page.waitForLoadState('networkidle');
    server.hold();
    const start = Date.now();
    await page.evaluate(() => {
      const state = window as typeof window & { completed?: boolean; baseline?: Promise<void> };
      state.completed = false;
      state.baseline = fetch('/library/__data.json')
        .then((response) => response.json())
        .then(() => {
          state.completed = true;
        });
    });
    await expect.poll(() => server.arrivals).toBeGreaterThan(0);
    // Confirm the gate causes a repeatable wait, rather than asserting a fast threshold.
    await new Promise((resolve) => setTimeout(resolve, 500));
    expect(
      await page.evaluate(() => (window as typeof window & { completed?: boolean }).completed),
    ).toBe(false);
    server.release();
    await page.evaluate(() => (window as typeof window & { baseline?: Promise<void> }).baseline);
    test.info().annotations.push({
      type: 'measurement',
      description: `Previous worker: cached page-data fetch ${Date.now() - start} ms; still pending after a 500 ms origin hold and completed only after release.`,
    });
  } finally {
    await server.close();
  }
});

test('uses production SvelteKit links, hover preloads, query filters, and back/forward navigation', async ({
  page,
  context,
}, info) => {
  const requests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/__data.json')) requests.push(request.url());
  });
  await page.goto('/');
  await controlled(page);
  const library = page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'library', exact: true });
  if (info.project.name === 'chromium') {
    await library.hover();
    await expect
      .poll(() => requests.some((url) => url.includes('/library/__data.json')))
      .toBe(true);
  }
  await library.click();
  await expect(page).toHaveURL(/\/library$/);
  await searchLibrary(page, 'creative reframing');
  await page
    .getByRole('region', { name: 'Library results' })
    .getByRole('link', { name: /Creative Reframing/ })
    .first()
    .click();
  await expect(
    page.getByRole('heading', { name: 'Creative Reframing', exact: true, level: 1 }),
  ).toBeVisible();
  expect(requests.some((url) => url.includes('x-sveltekit-invalidated='))).toBe(true);
  await page.goBack();
  await expect(page).toHaveURL(/\/library$/);
  await page.goForward();
  await expect(
    page.getByRole('heading', { name: 'Creative Reframing', exact: true, level: 1 }),
  ).toBeVisible();
  await page.goto('/library?verse=commons%3Alearning');
  await expect(page.getByRole('button', { name: 'Learning', exact: true }).first()).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await context.setOffline(true);
  await page.reload();
  await openLibrarySearch(page);
});

test('opens a new visit across a deployment while preserving older editing tabs', async ({
  page,
  context,
}) => {
  const built = await readFile(publicBuildFile('service-worker.js'), 'utf8');
  const currentVersion = JSON.parse(
    await readFile(publicBuildFile('_app/version.json'), 'utf8'),
  ).version;
  const encoded = built.match(/atob\(["'`]([A-Za-z0-9+/=]+)["'`]\)/)![1];
  const fingerprint = (body: string) => createHash('sha256').update(body).digest('base64');
  const searchPath = (body: string) =>
    `/library/search/${createHash('sha256').update(body).digest('hex')}.json`;
  const document = (release: string) =>
    `<!doctype html><title>Patternverse ${release}</title><h1>Private editing session</h1><input aria-label="Draft"><script>const announce=()=>navigator.serviceWorker.controller?.postMessage({type:'CLIENT_VERSION',version:'${release}'});announce();navigator.serviceWorker.addEventListener('controllerchange',()=>{announce();document.documentElement.dataset.controllerChanged='true';});navigator.serviceWorker.ready.then(r=>{const activate=()=>r.waiting?.postMessage({type:'SKIP_WAITING'});const watch=()=>r.installing?.addEventListener('statechange',activate);activate();watch();r.addEventListener('updatefound',watch);});</script>`;
  const makeWorker = (release: string) => {
    const manifest = {
      pages: {
        '/landing': fingerprint(document(release)),
        '/library/__data.json': fingerprint(release),
        '/unvisited/__data.json': fingerprint(release),
        [searchPath(release)]: fingerprint(release),
      },
      redirects: {},
    };
    return built
      .replace(encoded, Buffer.from(JSON.stringify(manifest)).toString('base64'))
      .replaceAll(currentVersion, release);
  };
  let release = 'previous';
  const server = createServer((request, response) => {
    response.setHeader('Cache-Control', 'public, max-age=0');
    const path = new URL(request.url!, 'http://localhost').pathname;
    if (path === '/service-worker.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(makeWorker(release));
    } else if (path === '/_app/version.json') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ version: release }));
    } else if (
      path === '/library/__data.json' ||
      path === '/unvisited/__data.json' ||
      path.startsWith('/library/search/')
    ) {
      response.setHeader('Content-Type', 'application/json');
      response.end(release);
    } else {
      response.setHeader('Content-Type', 'text/html');
      response.end(document(release));
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await page.goto(origin);
    await page.evaluate(() => navigator.serviceWorker.register('/service-worker.js'));
    await controlled(page);
    await page.evaluate(() =>
      navigator.serviceWorker.controller!.postMessage({
        type: 'CLIENT_VERSION',
        version: 'previous',
      }),
    );
    expect(await page.evaluate(async () => (await fetch('/library/__data.json')).text())).toBe(
      'previous',
    );
    expect(
      await page.evaluate(async (path) => (await fetch(path)).text(), searchPath('previous')),
    ).toBe('previous');
    const other = await context.newPage();
    await other.goto(origin);
    await other.evaluate(() =>
      navigator.serviceWorker.controller!.postMessage({
        type: 'CLIENT_VERSION',
        version: 'previous',
      }),
    );
    await other.getByRole('textbox', { name: 'Draft' }).fill('An unsaved idea');
    await other.evaluate(() => {
      (window as typeof window & { editingSession?: boolean }).editingSession = true;
    });
    release = 'next';
    // Reproduce an external arrival at a page not cached by the previous worker.
    const arrival = await context.newPage();
    const landing = `${origin}/landing?from=google#reading`;
    expect((await arrival.goto(landing))!.status()).toBe(200);
    await expect(arrival).toHaveURL(landing);
    await expect(arrival).toHaveTitle('Patternverse next');
    await expect(arrival.getByRole('heading', { name: 'Update Patternverse' })).toHaveCount(0);
    expect(await arrival.evaluate(async () => (await fetch('/library/__data.json')).text())).toBe(
      'next',
    );
    // Installation activates the worker without reloading an existing editing session.
    await expect(other.locator('html')).toHaveAttribute('data-controller-changed', 'true', {
      timeout: 30000,
    });
    await expect(other.getByRole('textbox', { name: 'Draft' })).toHaveValue('An unsaved idea');
    expect(
      await other.evaluate(
        () => (window as typeof window & { editingSession?: boolean }).editingSession,
      ),
    ).toBe(true);
    expect(await other.evaluate(async () => (await fetch('/library/__data.json')).text())).toBe(
      'previous',
    );
    expect(await other.evaluate(async () => (await fetch('/unvisited/__data.json')).status)).toBe(
      503,
    );
    await page.reload();
    await page.evaluate(() =>
      navigator.serviceWorker.controller!.postMessage({ type: 'CLIENT_VERSION', version: 'next' }),
    );
    expect(await page.evaluate(async () => (await fetch('/library/__data.json')).text())).toBe(
      'next',
    );
    expect(await other.evaluate(async () => (await fetch('/library/__data.json')).text())).toBe(
      'previous',
    );
    await context.setOffline(true);
    expect(
      await other.evaluate(async (path) => (await fetch(path)).text(), searchPath('previous')),
    ).toBe('previous');
    expect(await other.evaluate(async () => (await fetch('/library/__data.json')).text())).toBe(
      'previous',
    );
    await other.close();
    await arrival.close();
  } finally {
    await context.setOffline(false);
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
});

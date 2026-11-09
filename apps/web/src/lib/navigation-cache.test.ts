import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createNavigationCache, navigationKey, storableResponse } from './navigation-cache';

const origin = 'https://patternverse.example';
const path = '/library/__data.json';
const url = `${origin}${path}`;
const digest = (body: string) => createHash('sha256').update(body).digest('base64');
function basic(body: string, init?: ResponseInit): Response {
  const mark = (response: Response): Response => {
    Object.defineProperty(response, 'type', { value: 'basic' });
    Object.defineProperty(response, 'clone', {
      value: () => mark(Response.prototype.clone.call(response)),
    });
    return response;
  };
  return mark(new Response(body, init));
}
function setup(body = 'accepted content', version = 'new') {
  const stores = new Map<string, Map<string, Response>>();
  const open = async (name: string) => {
    const entries = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, entries);
    return {
      put: async (key: string, response: Response) => {
        entries.set(key, response.clone());
      },
      match: async (key: string) => entries.get(key)?.clone(),
    };
  };
  vi.stubGlobal('caches', { open });
  const network = vi.fn(async (request: Request) => {
    void request;
    return basic(body);
  });
  vi.stubGlobal('fetch', network);
  const update = vi.fn(async () => {});
  const manifest = {
    pages: { [path]: digest(body), '/library': digest(body) },
    redirects: { '/verse/example': { status: 308, location: '/library?verse=example' } },
  };
  const options = { origin, base: '', version, manifest, update };
  const navigation = createNavigationCache(options);
  return { stores, open, network, update, manifest, navigation, options };
}
afterEach(() => vi.unstubAllGlobals());

describe('accepted-release navigation caching', () => {
  it('returns cached documents and data without starting a network request', async () => {
    const app = setup();
    for (const key of [url, `${origin}/library`]) {
      await app.navigation.store(key, basic('accepted content'), 'patternverse-runtime-new');
      const response = await app.navigation.respond(new Request(key));
      expect(await response!.text()).toBe('accepted content');
    }
    expect(app.network).not.toHaveBeenCalled();
    expect(app.update).not.toHaveBeenCalled();
  });

  it('deduplicates simultaneous cache misses and stores successful matching content', async () => {
    const app = setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.network.mockImplementation(async () => {
      await gate;
      return basic('accepted content');
    });
    const first = app.navigation.respond(new Request(url));
    const second = app.navigation.respond(new Request(url));
    await vi.waitFor(() => expect(app.network).toHaveBeenCalledOnce());
    release();
    for (const response of await Promise.all([first, second]))
      expect(await response!.text()).toBe('accepted content');
    await app.navigation.respond(new Request(url));
    expect(app.network).toHaveBeenCalledOnce();
  });

  it('normalizes generated static query variants, preserving queries on a cache miss', async () => {
    const app = setup();
    const query = `${url}?verse=commons%3Alearning&x-sveltekit-invalidated=01&x-sveltekit-trailing-slash=1`;
    await app.navigation.respond(new Request(query));
    expect(app.network.mock.calls[0][0].url).toBe(query);
    expect(
      await (await app.navigation.respond(
        new Request(`${url}?verse=other&x-sveltekit-invalidated=11`),
      ))!.text(),
    ).toBe('accepted content');
    expect(app.network).toHaveBeenCalledOnce();
    expect(
      await app.navigation.respond(new Request(`${origin}/dynamic/__data.json?filter=other`)),
    ).toBeUndefined();
  });

  it.each<RequestInit>([
    { cache: 'no-store' as RequestCache },
    { headers: { authorization: 'Bearer example' } },
    { headers: { 'cache-control': 'no-store' } },
  ])('bypasses the cache for sensitive request semantics %j', async (init) => {
    const app = setup();
    expect(await app.navigation.respond(new Request(url, init))).toBeUndefined();
  });

  it.each(['private', 'no-store', 'private, max-age=0'])(
    'does not retain responses with Cache-Control: %s',
    async (control) => {
      const app = setup();
      app.network.mockImplementation(async () =>
        basic('accepted content', { headers: { 'cache-control': control } }),
      );
      expect((await app.navigation.respond(new Request(url)))!.status).toBe(200);
      await app.navigation.respond(new Request(url));
      expect(app.network).toHaveBeenCalledTimes(2);
    },
  );

  it('rejects private Vary/Set-Cookie responses and unsuccessful responses', async () => {
    const sensitiveHeaders: Record<string, string>[] = [
      { vary: '*' },
      { vary: 'Cookie' },
      { vary: 'Authorization' },
      { 'set-cookie': 'session=example' },
    ];
    for (const headers of sensitiveHeaders)
      expect(storableResponse(basic('content', { headers }))).toBe(false);
    const app = setup();
    app.network.mockImplementation(async () => basic('Not found', { status: 404 }));
    expect((await app.navigation.respond(new Request(url)))!.status).toBe(404);
    await app.navigation.respond(new Request(url));
    expect(app.network).toHaveBeenCalledTimes(2);
  });

  it('does not mix a new deployment into the accepted snapshot', async () => {
    const app = setup();
    app.network.mockImplementation(async () => basic('new deployment content'));
    const response = await app.navigation.respond(new Request(url));
    expect(response!.status).toBe(503);
    expect(response!.headers.get('content-type')).toBe('application/json');
    expect(app.update).toHaveBeenCalledOnce();
    expect(app.stores.get('patternverse-runtime-new')?.has(url)).toBe(false);
    // A failed future request cannot replace a valid accepted response.
    await app.navigation.store(url, basic('accepted content'), 'patternverse-runtime-new');
    app.network.mockRejectedValue(new Error('Connection failed'));
    expect(await (await app.navigation.respond(new Request(url)))!.text()).toBe('accepted content');
  });

  it('opens a fresh document from a newer deployment without caching it in the old release', async () => {
    const app = setup();
    await app.navigation.store(
      `${origin}/library`,
      basic('accepted content'),
      'patternverse-runtime-new',
    );
    app.network.mockImplementation(async () => basic('new deployment document'));
    const request = new Request(`${origin}/library?from=google`);
    Object.defineProperty(request, 'mode', { value: 'navigate' });
    const response = await app.navigation.respond(request);
    expect(response!.status).toBe(200);
    expect(await response!.text()).toBe('new deployment document');
    expect(app.network.mock.calls[0][0].url).toBe(request.url);
    expect(app.update).toHaveBeenCalledOnce();
    expect(await app.stores.get('patternverse-runtime-new')!.get(`${origin}/library`)!.text()).toBe(
      'accepted content',
    );
    // An existing tab must still never receive incompatible page data.
    expect((await app.navigation.respond(new Request(url)))!.status).toBe(503);
  });

  it('uses a saved document on a full load when offline', async () => {
    const app = setup();
    await app.navigation.store(
      `${origin}/library`,
      basic('accepted content'),
      'patternverse-runtime-new',
    );
    app.network.mockRejectedValue(new Error('Offline'));
    const request = new Request(`${origin}/library`);
    Object.defineProperty(request, 'mode', { value: 'navigate' });
    const response = await app.navigation.respond(request);
    expect(response!.status).toBe(200);
    expect(await response!.text()).toBe('accepted content');
    expect(app.network).toHaveBeenCalledOnce();
  });

  it('uses the arriving document’s snapshot when its worker finishes installing', async () => {
    const app = setup('old content', 'old');
    const next = createNavigationCache({
      ...app.options,
      version: 'next',
      manifest: { ...app.manifest, pages: { [path]: digest('new content') } },
    });
    app.update.mockImplementation(async () => next.install());
    app.network.mockImplementation(async () => basic('new content'));
    const response = await app.navigation.respond(new Request(url), 'next');
    expect(response!.status).toBe(200);
    expect(await response!.text()).toBe('new content');
    expect(app.update).toHaveBeenCalledOnce();
    expect(app.stores.get('patternverse-runtime-next')?.has(url)).toBe(true);
    expect(app.stores.get('patternverse-runtime-old')?.has(url)).not.toBe(true);
  });

  it('does not reuse a failed background warming job for a full navigation', async () => {
    const app = setup();
    app.network.mockImplementation(async () => basic('new deployment document'));
    const documentUrl = `${origin}/library`;
    const request = new Request(documentUrl);
    Object.defineProperty(request, 'mode', { value: 'navigate' });
    const [warming, navigation] = await Promise.all([
      app.navigation.respond(new Request(documentUrl)),
      app.navigation.respond(request),
    ]);
    expect(warming!.status).toBe(503);
    expect(navigation!.status).toBe(200);
    expect(await navigation!.text()).toBe('new deployment document');
  });

  it('keeps certified page data for older open tabs after another tab accepts an update', async () => {
    const app = setup('old content', 'old');
    await app.navigation.install();
    await app.navigation.registerClient('editing-tab', 'old', ['editing-tab']);
    await app.navigation.store(url, basic('old content'), 'patternverse-runtime-old');
    const next = createNavigationCache({
      ...app.options,
      version: 'next',
      manifest: { ...app.manifest, pages: { [path]: digest('new content') } },
    });
    await next.install();
    await next.inheritClients(['patternverse-precache-old'], ['editing-tab']);
    const release = await next.clientVersion('editing-tab');
    expect(release).toBe('old');
    expect(await (await next.respond(new Request(url), release))!.text()).toBe('old content');
    app.network.mockImplementation(async () => basic('new content'));
    expect(await (await next.respond(new Request(url)))!.text()).toBe('new content');
    expect(await (await next.respond(new Request(url), release))!.text()).toBe('old content');
  });

  it('fails closed if a tab’s persisted release binding is missing', async () => {
    const app = setup();
    expect(await app.navigation.clientVersion('unidentified-tab')).toBe('legacy');
    expect(
      (await app.navigation.respond(
        new Request(url),
        await app.navigation.clientVersion('unidentified-tab'),
      ))!.status,
    ).toBe(503);
    expect(app.network).not.toHaveBeenCalled();
    await app.navigation.registerClient('unidentified-tab', 'new', ['unidentified-tab']);
    expect(await app.navigation.clientVersion('unidentified-tab')).toBe('new');
  });

  it('keeps a loaded immutable search corpus for an old tab and rejects incompatible uncached bytes', async () => {
    const app = setup('old search', 'old');
    const searchPath = `/library/search/${'a'.repeat(64)}.json`;
    (app.manifest.pages as Record<string, string>)[searchPath] = digest('old search');
    await app.navigation.install();
    await app.navigation.registerClient('searching-tab', 'old', ['searching-tab']);
    await app.navigation.store(
      `${origin}${searchPath}`,
      basic('old search'),
      'patternverse-runtime-old',
    );
    const nextPath = `/library/search/${'b'.repeat(64)}.json`;
    const next = createNavigationCache({
      ...app.options,
      version: 'next',
      manifest: { pages: { [nextPath]: digest('new search') }, redirects: {} },
    });
    await next.install();
    await next.inheritClients(['patternverse-precache-old'], ['searching-tab']);
    app.network.mockImplementation(async () => basic('new search'));
    expect(await (await next.respond(new Request(`${origin}${searchPath}`), 'old'))!.text()).toBe(
      'old search',
    );
    expect(await (await next.respond(new Request(`${origin}${nextPath}`)))!.text()).toBe(
      'new search',
    );
    app.stores.get('patternverse-runtime-old')!.delete(`${origin}${searchPath}`);
    const incompatible = await next.respond(new Request(`${origin}${searchPath}`), 'old');
    expect(incompatible!.status).toBe(503);
    expect(typeof (await incompatible!.json())).toBe('string');
    expect(app.update).toHaveBeenCalledOnce();
  });

  it('serves build-defined redirects and gives JSON errors for uncached offline data', async () => {
    const app = setup();
    const redirect = await app.navigation.respond(new Request(`${origin}/verse/example`));
    expect(redirect!.status).toBe(308);
    expect(redirect!.headers.get('location')).toBe(`${origin}/library?verse=example`);
    app.network.mockRejectedValue(new Error('Offline'));
    const response = await app.navigation.respond(new Request(url));
    expect(response!.status).toBe(503);
    expect(typeof (await response!.json())).toBe('string');
  });

  it('retains a deployment base path and excludes ungenerated routes', () => {
    const manifest = { pages: { '/library': 'hash' }, redirects: {} };
    expect(navigationKey(new Request(`${origin}/app/library?verse=a`), manifest, '/app')).toBe(
      `${origin}/app/library`,
    );
    expect(navigationKey(new Request(`${origin}/library`), manifest, '/app')).toBeUndefined();
    expect(navigationKey(new Request(`${origin}/app/private`), manifest, '/app')).toBeUndefined();
  });
});

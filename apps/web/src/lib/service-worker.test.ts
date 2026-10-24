import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const origin = 'https://patternverse.example';
const assets = [
  '/offline.html',
  '/library',
  '/library/__data.json',
  '/pattern/example',
  '/pattern/example/__data.json',
  '/_app/immutable/app.js',
];

function basicResponse(body: string): Response {
  return asBasic(new Response(body));
}

function asBasic(response: Response): Response {
  Object.defineProperty(response, 'type', { value: 'basic' });
  Object.defineProperty(response, 'clone', {
    value: () => asBasic(Response.prototype.clone.call(response)),
  });
  return response;
}

function networkResponse(request: Request | string): Response {
  const url = typeof request === 'string' ? request : request.url;
  return basicResponse(
    url.endsWith('/_app/version.json') ? JSON.stringify({ version: 'new' }) : `Network: ${url}`,
  );
}

type TestEvent = {
  clientId?: string;
  request?: Request;
  data?: Record<string, unknown>;
  source?: { id?: string; postMessage: (message: unknown) => void };
  waitUntil: (promise: Promise<unknown>) => void;
  respondWith: (promise: Promise<Response>) => void;
};

async function setup() {
  const stores = new Map<string, Map<string, Response>>();
  const key = (request: Request | string) =>
    typeof request === 'string' ? new URL(request, origin).href : request.url;
  const open = async (name: string) => {
    const store = stores.get(name) ?? new Map<string, Response>();
    stores.set(name, store);
    return {
      async put(request: Request | string, response: Response) {
        store.set(key(request), response.clone());
      },
      async delete(request: Request | string) {
        return store.delete(key(request));
      },
      async match(request: Request | string, options?: { ignoreSearch?: boolean }) {
        const url = key(request);
        const entry = options?.ignoreSearch
          ? [...store].find(([stored]) => stored.split('?')[0] === url.split('?')[0])?.[1]
          : store.get(url);
        return entry?.clone();
      },
      async addAll(urls: string[]) {
        for (const url of urls) {
          const response = await fetch(url);
          if (!response.ok) throw new Error('Install failed');
          store.set(key(url), response);
        }
      },
    };
  };
  const listeners = new Map<string, (event: TestEvent) => void>();
  const client = { id: 'old-window', postMessage: vi.fn() };
  const clients = {
    matchAll: vi.fn(async () => [client]),
    claim: vi.fn(async () => {}),
    get: vi.fn(async () => client),
  };
  const skipWaiting = vi.fn(async () => {});
  const registration = { update: vi.fn(async () => {}), waiting: null, installing: null };
  const network = vi.fn(async (request: Request | string) => networkResponse(request));
  vi.stubGlobal('fetch', network);
  vi.stubGlobal('caches', {
    open,
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  });
  vi.stubGlobal('self', {
    location: { origin },
    clients,
    skipWaiting,
    registration,
    addEventListener: (type: string, listener: (event: TestEvent) => void) =>
      listeners.set(type, listener),
  });
  vi.doMock('$service-worker', () => ({
    base: '',
    build: [assets[5]],
    files: ['/offline.html', '/_headers'],
    prerendered: [...assets.slice(1, 5), '/auth/provider/callback'],
    version: 'new',
  }));
  vi.doMock('./navigation-manifest', () => ({
    navigationManifest: {
      pages: Object.fromEntries(
        assets
          .slice(1, 5)
          .map((path) => [
            path,
            createHash('sha256').update(`Network: ${origin}${path}`).digest('base64'),
          ]),
      ),
      redirects: {},
    },
  }));
  await import('../service-worker');
  async function dispatch(type: string, options: Partial<TestEvent> = {}) {
    const pending: Promise<unknown>[] = [];
    let response: Promise<Response> | undefined;
    listeners.get(type)!({
      ...options,
      waitUntil: (promise) => pending.push(promise),
      respondWith: (promise) => {
        response = promise;
      },
    });
    const result = response ? await response : undefined;
    await Promise.all(pending);
    return result;
  }
  const message = (data: Record<string, unknown>) =>
    dispatch('message', {
      data: { ...(data.type === 'DOWNLOAD_OFFLINE' ? { version: 'new' } : {}), ...data },
      source: client,
    });
  return { stores, open, clients, client, network, skipWaiting, dispatch, message };
}

beforeEach(() => vi.resetModules());
afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('$service-worker');
  vi.doUnmock('./navigation-manifest');
});

describe('service worker offline lifecycle', () => {
  it('installs only the standalone fallback even when optional requests fail', async () => {
    const app = await setup();
    app.network.mockImplementation(async (request) => {
      if (String(request).endsWith('/offline.html')) return basicResponse('Offline starting page');
      throw new Error('Unavailable optional resource');
    });
    await app.dispatch('install');
    expect(app.network).toHaveBeenCalledTimes(1);
    expect(
      [...app.stores.get('patternverse-precache-new')!.keys()].filter(
        (url) => !url.includes('__navigation_'),
      ),
    ).toEqual([`${origin}/offline.html`]);
    expect(app.skipWaiting).not.toHaveBeenCalled();
  });

  it('captures a first visit and its page data/assets without downloading unrelated pages', async () => {
    const app = await setup();
    await app.message({
      type: 'CACHE_VISIT',
      paths: [
        '/pattern/example',
        '/pattern/example/__data.json',
        assets[5],
        '/auth/provider/callback?code=secret',
        '/unlisted',
      ],
    });
    expect(
      app.network.mock.calls.map(([request]) =>
        typeof request === 'string' ? request : request.url,
      ),
    ).toEqual([
      `${origin}${assets[5]}`,
      `${origin}/pattern/example`,
      `${origin}/pattern/example/__data.json`,
    ]);
    app.network.mockRejectedValue(new Error('Offline'));
    const response = await app.dispatch('fetch', {
      request: new Request(`${origin}/pattern/example/__data.json`),
    });
    expect(await response!.text()).toContain('/pattern/example/__data.json');
  });

  it('does not save first-visit navigation before its loaded resources finish', async () => {
    const app = await setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.network.mockImplementation(async (request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (url.endsWith('/app.js')) await gate;
      return networkResponse(request);
    });
    const warm = app.message({ type: 'CACHE_VISIT', paths: assets.slice(3) });
    try {
      await vi.waitFor(() => expect(app.network).toHaveBeenCalledOnce());
      expect(app.network.mock.calls[0][0]).toBe(`${origin}${assets[5]}`);
      expect(app.stores.get('patternverse-runtime-new')?.size ?? 0).toBe(0);
    } finally {
      release();
      await warm;
    }
    expect(app.stores.get('patternverse-runtime-new')?.has(`${origin}/pattern/example`)).toBe(true);
  });

  it('does not save first-visit navigation after a loaded resource fails', async () => {
    const app = await setup();
    app.network.mockRejectedValue(new Error('Connection lost'));
    await app.message({ type: 'CACHE_VISIT', paths: assets.slice(3) });
    expect(app.network).toHaveBeenCalledOnce();
    expect(app.stores.get('patternverse-runtime-new')?.size ?? 0).toBe(0);
  });

  it('serves the installed offline document directly when a browser follows the fallback redirect', async () => {
    const app = await setup();
    await app.dispatch('install');
    app.network.mockRejectedValue(new Error('Offline'));
    const navigate = (path: string) => {
      const request = new Request(`${origin}${path}`);
      Object.defineProperty(request, 'mode', { value: 'navigate' });
      return app.dispatch('fetch', { request });
    };
    const missing = await navigate('/never-visited');
    expect(missing!.status).toBe(302);
    expect(missing!.headers.get('location')).toBe(`${origin}/offline.html`);
    const fallback = await navigate('/offline.html');
    expect(fallback!.status).toBe(200);
    expect(await fallback!.text()).toBe(`Network: ${origin}/offline.html`);
  });

  it('bounds automatic warmups across overlapping visits', async () => {
    const app = await setup();
    let active = 0;
    let maximum = 0;
    app.network.mockImplementation(async (request) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
      return networkResponse(request);
    });
    await Promise.all([
      app.message({ type: 'CACHE_VISIT', paths: assets.slice(0, 3) }),
      app.message({ type: 'CACHE_VISIT', paths: assets.slice(3) }),
      app.message({ type: 'CACHE_VISIT', paths: assets }),
    ]);
    expect(maximum).toBe(2);
    expect(app.network.mock.calls).toHaveLength(assets.length);
  });

  it('shares a first-visit page-data fetch with simultaneous foreground navigation', async () => {
    const app = await setup();
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.network.mockImplementation(async (request) => {
      const url = typeof request === 'string' ? request : request.url;
      if (url.endsWith('/library/__data.json')) await gate;
      return networkResponse(request);
    });
    const warm = app.message({ type: 'CACHE_VISIT', paths: [`${origin}/library/__data.json`] });
    const visit = app.dispatch('fetch', { request: new Request(`${origin}/library/__data.json`) });
    await vi.waitFor(() =>
      expect(
        app.network.mock.calls.filter(([request]) =>
          (typeof request === 'string' ? request : request.url).endsWith('/library/__data.json'),
        ),
      ).toHaveLength(1),
    );
    release();
    await warm;
    expect((await visit)!.status).toBe(200);
    expect(
      app.network.mock.calls.filter(([request]) =>
        (typeof request === 'string' ? request : request.url).endsWith('/library/__data.json'),
      ),
    ).toHaveLength(1);
  });

  it('pauses an interrupted full download, resumes cached results, and persists completion', async () => {
    const app = await setup();
    app.network.mockImplementation(async (request) => {
      if (String(request).endsWith('/offline.html')) throw new Error('Connection lost');
      return networkResponse(request);
    });
    await app.message({ type: 'DOWNLOAD_OFFLINE' });
    expect(app.client.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'paused' }),
    );
    const downloaded = app.network.mock.calls.filter(([url]) =>
      String(url).endsWith('/app.js'),
    ).length;
    expect(downloaded).toBe(1);
    app.network.mockImplementation(async (request) => networkResponse(request));
    await app.message({ type: 'DOWNLOAD_OFFLINE' });
    expect(app.network.mock.calls.filter(([url]) => String(url).endsWith('/app.js'))).toHaveLength(
      1,
    );
    await app.message({ type: 'OFFLINE_STATUS' });
    expect(app.client.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'complete' }),
    );
    expect(app.network.mock.calls.some(([url]) => /auth|_headers/.test(String(url)))).toBe(false);
  });

  it('reuses static page data, excludes auth, and bypasses caches for probes', async () => {
    const app = await setup();
    await (
      await app.open('patternverse-runtime-new')
    ).put(`${origin}/library/__data.json`, networkResponse(`${origin}/library/__data.json`));
    const live = await app.dispatch('fetch', {
      request: new Request(`${origin}/library/__data.json`),
    });
    expect(await live!.text()).toContain('Network:');
    expect(
      app.network.mock.calls.some(([request]) =>
        (typeof request === 'string' ? request : request.url).endsWith('/library/__data.json'),
      ),
    ).toBe(false);
    await app.dispatch('fetch', {
      request: new Request(`${origin}/auth/provider/callback?code=secret`),
    });
    expect(app.network).toHaveBeenLastCalledWith(expect.any(Request), { cache: 'no-store' });
    const probe = new Request(`${origin}/manifest.webmanifest`, {
      headers: { 'x-patternverse-network-probe': '1' },
    });
    app.network.mockRejectedValue(new Error('Offline'));
    expect((await app.dispatch('fetch', { request: probe }))!.status).toBe(503);
    expect(
      [...app.stores.values()]
        .flatMap((store) => [...store.keys()])
        .some((url) => /auth|network-probe/.test(url)),
    ).toBe(false);
  });

  it('does not certify a snapshot if deployment changes during the download', async () => {
    const app = await setup();
    let probes = 0;
    app.network.mockImplementation(async (request) => {
      if (String(request).endsWith('/_app/version.json')) {
        return basicResponse(JSON.stringify({ version: ++probes === 1 ? 'new' : 'future' }));
      }
      return networkResponse(request);
    });
    await app.message({ type: 'DOWNLOAD_OFFLINE' });
    expect(probes).toBe(2);
    expect(app.client.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ state: 'paused' }),
    );
    expect(app.stores.get('patternverse-offline-new')!.has(`${origin}/__offline_complete__`)).toBe(
      false,
    );
  });

  it('deduplicates background update checks and leaves cached data intact when a check fails', async () => {
    const app = await setup();
    await (
      await app.open('patternverse-runtime-new')
    ).put(`${origin}/library/__data.json`, networkResponse(`${origin}/library/__data.json`));
    app.network.mockRejectedValue(new Error('Update server unavailable'));
    const requests = [0, 1, 2].map(() =>
      app.dispatch('fetch', {
        request: new Request(`${origin}/library/__data.json?x-sveltekit-invalidated=01`),
      }),
    );
    for (const response of await Promise.all(requests)) expect(response!.status).toBe(200);
    await app.dispatch('fetch', { request: new Request(`${origin}/library/__data.json`) });
    expect(app.network).toHaveBeenCalledOnce();
    expect(app.network).toHaveBeenCalledWith(
      '/_app/version.json',
      expect.objectContaining({ cache: 'no-store' }),
    );
  });

  it('leaves non-GET and explicitly uncached requests outside navigation caching', async () => {
    const app = await setup();
    await app.dispatch('fetch', {
      request: new Request(`${origin}/library/__data.json`, { method: 'POST', body: 'example' }),
    });
    expect(app.network).not.toHaveBeenCalled();
    const request = new Request(`${origin}/library/__data.json?private=example`, {
      cache: 'no-store',
    });
    await app.dispatch('fetch', { request });
    expect(app.network).toHaveBeenCalledExactlyOnceWith(request);
    expect(app.stores.size).toBe(0);
  });

  it('serializes simultaneous tab registrations before pruning old client bindings', async () => {
    const app = await setup();
    const other = { id: 'second-window', postMessage: vi.fn() };
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    app.clients.matchAll.mockImplementationOnce(async () => {
      await gate;
      return [app.client];
    });
    app.clients.matchAll.mockResolvedValue([app.client, other]);
    const first = app.message({ type: 'CLIENT_VERSION', version: 'new' });
    const second = app.dispatch('message', {
      data: { type: 'CLIENT_VERSION', version: 'new' },
      source: other,
    });
    await vi.waitFor(() => expect(app.clients.matchAll).toHaveBeenCalledOnce());
    release();
    await Promise.all([first, second]);
    expect(
      (await app.dispatch('fetch', {
        request: new Request(`${origin}/library/__data.json`),
        clientId: other.id,
      }))!.status,
    ).toBe(200);
  });

  it('requests an update instead of downloading a different release for an older tab', async () => {
    const app = await setup();
    await app.message({ type: 'DOWNLOAD_OFFLINE', version: 'old' });
    expect(app.client.postMessage).toHaveBeenLastCalledWith({
      type: 'UPDATE_REQUIRED',
      version: 'new',
    });
    expect(app.network).not.toHaveBeenCalled();
    await app.message({ type: 'OFFLINE_STATUS' });
    expect(app.client.postMessage).toHaveBeenLastCalledWith(
      expect.objectContaining({ type: 'OFFLINE_DOWNLOAD', version: 'new' }),
    );
  });

  it('retains old chunks for open tabs but never serves another snapshot’s page data', async () => {
    const app = await setup();
    const old = await app.open('patternverse-precache-old');
    await old.put(`${origin}/_app/immutable/old.js`, basicResponse('Old chunk'));
    await old.put(`${origin}/library/__data.json`, basicResponse('Old data'));
    await app.dispatch('activate');
    expect(app.stores.has('patternverse-precache-old')).toBe(true);
    app.network.mockRejectedValue(new Error('Offline'));
    const chunk = await app.dispatch('fetch', {
      request: new Request(`${origin}/_app/immutable/old.js`),
    });
    expect(await chunk!.text()).toBe('Old chunk');
    expect(
      (await app.dispatch('fetch', { request: new Request(`${origin}/library/__data.json`) }))!
        .status,
    ).toBe(503);
    app.clients.matchAll.mockResolvedValue([]);
    // A newer installing worker must survive deferred cleanup.
    await app.open('patternverse-precache-future');
    await app.message({ type: 'OFFLINE_STATUS' });
    expect(app.stores.has('patternverse-precache-old')).toBe(false);
    expect(app.stores.has('patternverse-precache-future')).toBe(true);
    await app.message({ type: 'SKIP_WAITING' });
    expect(app.skipWaiting).toHaveBeenCalledOnce();
  });
});

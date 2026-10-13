/// <reference lib="webworker" />

import { base, build, files, prerendered, version } from '$service-worker';
import { precacheUrls } from './lib/service-worker-cache';

const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'patternverse-';
const PRECACHE = `${CACHE_PREFIX}precache-${version}`;
const RUNTIME = `${CACHE_PREFIX}runtime-${version}`;
const isAuthorizationPath = (path: string): boolean => path.startsWith(`${base}/auth/`);
const APP_SHELL = precacheUrls([...build, ...files, ...prerendered], worker.location.origin).filter(
  (asset) => {
    const { pathname } = new URL(asset);
    return !isAuthorizationPath(pathname) && !pathname.endsWith('/_headers');
  },
);
const APP_SHELL_PATHS = new Set(
  APP_SHELL.map((asset) => new URL(asset, worker.location.origin).pathname),
);
const HOME = `${base}/`;

const broadcastNetworkStatus = async (online: boolean): Promise<void> => {
  const clients = await worker.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'NETWORK_STATUS', online }));
};

const cacheResponse = async (cacheName: string, request: Request, response: Response) => {
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(cacheName);
    await cache.put(request, response.clone());
  }
  return response;
};

const cached = async (request: Request, ignoreSearch = false): Promise<Response | undefined> => {
  // Fresh network copies must win over the install-time page snapshot when offline.
  const runtime = await caches.open(RUNTIME);
  const latest = await runtime.match(request, { ignoreSearch });
  if (latest) return latest;
  const response = await caches.match(request, { ignoreSearch });
  return response ?? undefined;
};

const networkFirst = async (request: Request): Promise<Response> => {
  try {
    const response = await fetch(request);
    void broadcastNetworkStatus(true);
    return await cacheResponse(RUNTIME, request, response);
  } catch (error) {
    void broadcastNetworkStatus(false);
    const response = await cached(request, true);
    if (response) return response;

    if (request.mode === 'navigate') {
      const home = await cached(new Request(new URL(HOME, worker.location.origin)), true);
      if (home) return home;
    }

    throw error;
  }
};

const staleWhileRevalidate = async (request: Request): Promise<Response> => {
  const cacheHit = await cached(request);
  const networkResponse = fetch(request)
    .then((response) => {
      void broadcastNetworkStatus(true);
      return cacheResponse(RUNTIME, request, response);
    })
    .catch(() => {
      void broadcastNetworkStatus(false);
      return undefined;
    });

  if (cacheHit) {
    void networkResponse;
    return cacheHit;
  }

  const response = await networkResponse;
  if (response) return response;
  throw new Error(`Patternverse could not load ${request.url} while offline.`);
};

const appShellResponse = async (request: Request): Promise<Response> => {
  const cacheHit = await cached(request, true);
  if (cacheHit) return cacheHit;
  return networkFirst(request);
};

worker.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PRECACHE).then((cache) => cache.addAll(APP_SHELL)));
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      await Promise.all(
        cacheNames.map((cacheName) =>
          cacheName.startsWith(CACHE_PREFIX) && cacheName !== PRECACHE && cacheName !== RUNTIME
            ? caches.delete(cacheName)
            : Promise.resolve(false),
        ),
      );
      await worker.clients.claim();
    }),
  );
});

worker.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void worker.skipWaiting();
});

worker.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== worker.location.origin) return;
  // OAuth responses must never enter offline caches (including query-string credentials).
  if (isAuthorizationPath(url.pathname)) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (request.headers.get('x-patternverse-network-probe') === '1') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          void broadcastNetworkStatus(true);
          return response;
        })
        .catch(() => {
          void broadcastNetworkStatus(false);
          return new Response(null, { status: 503, statusText: 'Offline' });
        }),
    );
    return;
  }

  if (request.mode === 'navigate' || url.pathname.endsWith('/__data.json')) {
    event.respondWith(networkFirst(request));
    return;
  }

  if (APP_SHELL_PATHS.has(url.pathname)) {
    event.respondWith(appShellResponse(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

/// <reference lib="webworker" />

import { base, build, files, prerendered, version } from '$service-worker';
import { downloadOfflineUrls, installationUrls, offlineUrls } from './lib/service-worker-cache';
import { navigationManifest } from './lib/navigation-manifest';
import { createNavigationCache, storableResponse } from './lib/navigation-cache';
import { isLibrarySearchPath } from './lib/library-search-asset';

const worker = self as unknown as ServiceWorkerGlobalScope;

const CACHE_PREFIX = 'patternverse-';
const PRECACHE = `${CACHE_PREFIX}precache-${version}`;
const RUNTIME = `${CACHE_PREFIX}runtime-${version}`;
const OFFLINE = `${CACHE_PREFIX}offline-${version}`;
const isAuthorizationPath = (path: string): boolean => path.startsWith(`${base}/auth/`);
const ORIGIN = worker.location.origin;
const INSTALL = installationUrls(ORIGIN, base);
const DOWNLOADS = offlineUrls([...build, ...files, ...prerendered], ORIGIN, base);
const DOWNLOAD_PATHS = new Set(DOWNLOADS.map((asset) => new URL(asset).pathname));
const COMPLETE = new URL(`${base}/__offline_complete__`, ORIGIN).href;
const RETIRED = new URL(`${base}/__offline_retired__`, ORIGIN).href;
const CURRENT_CACHES = [RUNTIME, OFFLINE, PRECACHE];
let downloadController: AbortController | undefined;
let downloadStatus = { state: 'idle', completed: 0, total: DOWNLOADS.length };
const UPDATE_CHECK = new URL(`${base}/__navigation_update_check__`, ORIGIN).href;
let updateCheck: Promise<void> | undefined;
let lastUrgentUpdate = 0;
const checkForUpdate = (urgent = false): Promise<void> => {
  if (updateCheck) return urgent ? updateCheck.then(() => checkForUpdate(true)) : updateCheck;
  updateCheck = (async () => {
    try {
      if (urgent) {
        if (
          Date.now() - lastUrgentUpdate < 60_000 ||
          worker.registration.waiting ||
          worker.registration.installing
        )
          return;
        lastUrgentUpdate = Date.now();
        await worker.registration.update();
        return;
      }
      const cache = await caches.open(PRECACHE);
      const previous = await cache.match(UPDATE_CHECK);
      if (previous && Date.now() - Number(await previous.text()) < 300_000) return;
      await cache.put(UPDATE_CHECK, new Response(String(Date.now())));
      const response = await fetch(`${base}/_app/version.json`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      if (response.ok && (await response.json()).version !== version)
        await worker.registration.update();
    } catch {
      /* Background update failures leave the accepted snapshot available. */
    }
  })().finally(() => {
    updateCheck = undefined;
  });
  return updateCheck;
};
const navigation = createNavigationCache({
  base,
  origin: ORIGIN,
  version,
  manifest: navigationManifest,
  update: () => checkForUpdate(true),
});
const clientBindings = new Map<string, Promise<void>>();
let registrationWork = Promise.resolve();

const pruneRetiredCaches = async () => {
  const cache = await caches.open(PRECACHE);
  const record = await cache.match(RETIRED);
  if (!record) return;
  const retired: { clients: string[]; caches: string[] } = await record.json();
  const clients = await worker.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  if (clients.some((client) => retired.clients.includes(client.id))) return;
  // Only retire the generations recorded at activation, never a newer waiting worker.
  await Promise.all(retired.caches.map((name) => caches.delete(name)));
  await cache.delete(RETIRED);
};

const broadcastDownloadStatus = async () => {
  const clients = await worker.clients.matchAll({ type: 'window' });
  clients.forEach((client) =>
    client.postMessage({ type: 'OFFLINE_DOWNLOAD', version, ...downloadStatus }),
  );
};

const downloadLibrary = async () => {
  if (downloadController) return;
  const controller = new AbortController();
  downloadController = controller;
  downloadStatus = { state: 'downloading', completed: 0, total: DOWNLOADS.length };
  await broadcastDownloadStatus();
  let lastProgress = 0;
  try {
    const assertCurrentDeployment = async () => {
      const response = await fetch(`${base}/_app/version.json`, {
        cache: 'no-store',
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]),
      });
      if (!response.ok || (await response.json()).version !== version)
        throw new Error('Deployment changed during offline download.');
    };
    // HTML and page data have stable URLs: don't certify a snapshot across a deployment.
    await assertCurrentDeployment();
    const cache = await caches.open(OFFLINE);
    const result = await downloadOfflineUrls(
      DOWNLOADS,
      async (url, signal) => {
        const path = new URL(url).pathname.slice(base.length);
        if (navigationManifest.redirects[path]) return;
        if (await cached(new Request(url))) return;
        const response = await fetch(url, {
          signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
          cache: 'no-cache',
        });
        if (
          !response.ok ||
          response.type !== 'basic' ||
          (response.url &&
            (new URL(response.url).origin !== ORIGIN ||
              isAuthorizationPath(new URL(response.url).pathname)))
        )
          throw new Error('Offline download unavailable.');
        if (navigationManifest.pages[path]) {
          if (!(await navigation.store(url, response, OFFLINE)))
            throw new Error('Offline content belongs to another release.');
        } else {
          if (!storableResponse(response)) throw new Error('Resource cannot be saved offline.');
          await cache.put(url, response);
        }
      },
      controller.signal,
      (completed) => {
        downloadStatus.completed = completed;
        if (Date.now() - lastProgress > 250) {
          lastProgress = Date.now();
          void broadcastDownloadStatus();
        }
      },
    );
    const complete =
      !controller.signal.aborted && !result.failed && result.completed === DOWNLOADS.length;
    if (complete) {
      await assertCurrentDeployment();
      await cache.put(COMPLETE, new Response('complete'));
    }
    downloadStatus.state = complete ? 'complete' : 'paused';
  } catch {
    downloadStatus.state = 'paused';
  } finally {
    downloadController = undefined;
    await broadcastDownloadStatus();
  }
};

// Browsing may begin before the first worker takes control. Capture that page's
// already loaded resources, and the HTML/data needed for a later offline reload.
const cacheVisit = async (paths: unknown) => {
  if (!Array.isArray(paths)) return;
  await pruneRetiredCaches();
  const urls = offlineUrls(
    paths.filter((path): path is string => typeof path === 'string'),
    ORIGIN,
    base,
  )
    .filter((url) => DOWNLOAD_PATHS.has(new URL(url).pathname))
    .slice(0, 128);
  const isNavigation = (url: string) =>
    Boolean(navigationManifest.pages[new URL(url).pathname.slice(base.length)]);
  const download = async (url: string, signal: AbortSignal) => {
    if (navigationManifest.pages[new URL(url).pathname.slice(base.length)]) {
      // First-visit warming and foreground navigation share the same miss job.
      const response = await navigation.respond(new Request(url));
      if (!response?.ok) throw new Error('This page cannot be saved for this release.');
      return;
    }
    if (await cached(new Request(url))) return;
    const response = await fetch(url, {
      signal: AbortSignal.any([signal, AbortSignal.timeout(15_000)]),
    });
    await cacheResponse(RUNTIME, new Request(url), response);
  };
  const signal = new AbortController().signal;
  // Save dependencies before documents so a completed first visit can hydrate offline.
  const resources = await downloadOfflineUrls(
    urls.filter((url) => !isNavigation(url)),
    download,
    signal,
    () => {},
  );
  if (resources.failed) return;
  await downloadOfflineUrls(urls.filter(isNavigation), download, signal, () => {});
};

let pendingVisit: unknown;
let visitWork: Promise<void> | undefined;
const warmVisit = (paths: unknown): Promise<void> => {
  // Rapid navigation keeps one active batch and only the latest pending visit.
  pendingVisit = paths;
  visitWork ??= (async () => {
    while (pendingVisit) {
      const next = pendingVisit;
      pendingVisit = undefined;
      await cacheVisit(next);
    }
  })().finally(() => {
    visitWork = undefined;
  });
  return visitWork;
};

const broadcastNetworkStatus = async (online: boolean): Promise<void> => {
  const clients = await worker.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'NETWORK_STATUS', online }));
};

const cacheResponse = async (cacheName: string, request: Request, response: Response) => {
  if (request.cache === 'no-store' || request.headers.has('authorization')) return response;
  if (navigationManifest.pages[new URL(request.url).pathname.slice(base.length)]) {
    try {
      await navigation.store(request.url, response, cacheName);
    } catch {
      /* Storage is optional for online reading. */
    }
    return response;
  }
  if (
    storableResponse(response) &&
    (!response.url || !isAuthorizationPath(new URL(response.url).pathname))
  ) {
    try {
      const cache = await caches.open(cacheName);
      await cache.put(request, response.clone());
    } catch {
      // Storage pressure must not turn a successful online request into a failure.
    }
  }
  return response;
};

const cached = async (request: Request, ignoreSearch = false): Promise<Response | undefined> => {
  // Fresh network copies must win over the install-time page snapshot when offline.
  for (const name of CURRENT_CACHES) {
    const cache = await caches.open(name);
    const response = await cache.match(request, { ignoreSearch });
    if (response) return response;
  }
  // Old tabs still request old content-addressed chunks after an accepted update.
  // Only immutable URLs may cross snapshot boundaries; HTML/data never do.
  if (new URL(request.url).pathname.startsWith(`${base}/_app/immutable/`)) {
    for (const name of await caches.keys()) {
      if (!name.startsWith(CACHE_PREFIX) || CURRENT_CACHES.includes(name)) continue;
      const response = await (await caches.open(name)).match(request);
      if (response) return response;
    }
  }
  return undefined;
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
      const fallback = await cached(new Request(INSTALL[0]));
      if (fallback) return Response.redirect(INSTALL[0], 302);
    }

    throw error;
  }
};

const staleWhileRevalidate = async (request: Request, event: FetchEvent): Promise<Response> => {
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
    event.waitUntil(networkResponse);
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
  // One standalone fallback. Full offline coverage is an explicit, resumable job.
  event.waitUntil(
    (async () => {
      await (await caches.open(PRECACHE)).addAll(INSTALL);
      await navigation.install();
    })(),
  );
});

worker.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(async (cacheNames) => {
      // skipWaiting can replace a worker while other tabs still use its chunks.
      // Keep those generations until the windows present at activation close/reload.
      const clients = await worker.clients.matchAll({ includeUncontrolled: true, type: 'window' });
      const retired = cacheNames.filter(
        (name) => name.startsWith(CACHE_PREFIX) && !CURRENT_CACHES.includes(name),
      );
      await navigation.inheritClients(
        retired,
        clients.map((client) => client.id),
      );
      if (retired.length) {
        const cache = await caches.open(PRECACHE);
        await cache.put(
          RETIRED,
          new Response(
            JSON.stringify({ clients: clients.map((client) => client.id), caches: retired }),
          ),
        );
        await pruneRetiredCaches();
      }
      await worker.clients.claim();
    }),
  );
});

worker.addEventListener('message', (event) => {
  if (
    event.data?.type === 'CLIENT_VERSION' &&
    event.source &&
    'id' in event.source &&
    typeof event.data.version === 'string'
  ) {
    const id = event.source.id;
    // Serialize the live-client snapshot and mutation together: one tab must not
    // prune a newly registered tab using an older matchAll result.
    const binding: Promise<void> = registrationWork
      .catch(() => {})
      .then(async () => {
        const clients = await worker.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        await navigation.registerClient(
          id,
          event.data.version,
          clients.map((client) => client.id),
        );
      })
      .finally(() => {
        if (clientBindings.get(id) === binding) clientBindings.delete(id);
      });
    registrationWork = binding;
    clientBindings.set(id, binding);
    event.waitUntil(binding);
  }
  if (event.data?.type === 'SKIP_WAITING') event.waitUntil(worker.skipWaiting());
  if (event.data?.type === 'CACHE_VISIT') event.waitUntil(warmVisit(event.data.paths));
  if (event.data?.type === 'DOWNLOAD_OFFLINE') {
    event.waitUntil(
      (async () => {
        const id = event.source && 'id' in event.source ? event.source.id : '';
        await clientBindings.get(id);
        const requested =
          typeof event.data.version === 'string'
            ? event.data.version
            : await navigation.clientVersion(id);
        if (requested !== version) {
          event.source?.postMessage({ type: 'UPDATE_REQUIRED', version });
          return;
        }
        await downloadLibrary();
      })(),
    );
  }
  if (event.data?.type === 'CANCEL_OFFLINE') downloadController?.abort();
  if (event.data?.type === 'OFFLINE_STATUS') {
    event.waitUntil(
      (async () => {
        const id = event.source && 'id' in event.source ? event.source.id : '';
        await clientBindings.get(id);
        const requested =
          typeof event.data.version === 'string'
            ? event.data.version
            : await navigation.clientVersion(id);
        if (id && requested !== version)
          event.source?.postMessage({ type: 'UPDATE_REQUIRED', version });
        await pruneRetiredCaches();
        if (!downloadController) {
          const complete = await (await caches.open(OFFLINE)).match(COMPLETE);
          downloadStatus.state = complete ? 'complete' : 'idle';
        }
        event.source?.postMessage({ type: 'OFFLINE_DOWNLOAD', version, ...downloadStatus });
      })(),
    );
  }
});

worker.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== worker.location.origin) return;
  // OAuth responses must never enter offline caches (including query-string credentials).
  if (
    isAuthorizationPath(url.pathname) ||
    /^\/owner(?:\/|$)/.test(url.pathname) ||
    url.pathname === '/api/usage'
  ) {
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

  if (
    request.cache === 'no-store' ||
    request.headers.has('authorization') ||
    /\bno-store\b/i.test(request.headers.get('cache-control') ?? '') ||
    url.pathname === `${base}/_app/version.json`
  ) {
    event.respondWith(fetch(request));
    return;
  }

  // Static documents must be served before navigation fallback handling. Redirecting
  // /offline.html back to itself would loop when the network is unavailable.
  if (url.pathname === `${base}/offline.html` || url.pathname === `${base}/widget-host/frame.htm`) {
    event.respondWith(appShellResponse(request));
    return;
  }

  if (
    request.mode === 'navigate' ||
    url.pathname.endsWith('/__data.json') ||
    isLibrarySearchPath(url.pathname.slice(base.length))
  ) {
    event.waitUntil(checkForUpdate());
    event.respondWith(
      (async () => {
        await clientBindings.get(event.clientId);
        const release =
          request.mode === 'navigate' ? version : await navigation.clientVersion(event.clientId);
        const response = await navigation.respond(request, release);
        if (response?.headers.has('x-patternverse-update-required') && event.clientId) {
          const client = await worker.clients.get(event.clientId);
          client?.postMessage({ type: 'UPDATE_REQUIRED', version });
        }
        if (response) return response;
        // Unknown/dynamic routes and explicit no-store requests retain their exact
        // request semantics and never enter the static navigation cache.
        try {
          return await fetch(request);
        } catch (error) {
          if (request.mode === 'navigate') return Response.redirect(INSTALL[0], 302);
          throw error;
        }
      })(),
    );
    return;
  }

  if (DOWNLOAD_PATHS.has(url.pathname)) {
    event.respondWith(appShellResponse(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request, event));
});

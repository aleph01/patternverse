import type { NavigationManifest } from './navigation-manifest';
import { isLibrarySearchPath } from './library-search-asset';

/** Only the generated public responses can ignore search: their loaders run at build time. */
export function navigationKey(
  request: Request,
  manifest: NavigationManifest,
  base: string,
): string | undefined {
  const url = new URL(request.url);
  const path = url.pathname.slice(base.length);
  if (
    request.method !== 'GET' ||
    !url.pathname.startsWith(`${base}/`) ||
    !(path in manifest.pages || path in manifest.redirects)
  )
    return;
  if (
    request.headers.has('authorization') ||
    request.cache === 'no-store' ||
    /\bno-store\b/i.test(request.headers.get('cache-control') ?? '')
  )
    return;
  return `${url.origin}${url.pathname}`;
}

export function storableResponse(response: Response): boolean {
  return (
    response.status === 200 &&
    response.type === 'basic' &&
    !response.redirected &&
    !/\b(?:no-store|private)\b/i.test(response.headers.get('cache-control') ?? '') &&
    !response.headers.has('set-cookie') &&
    !/^(?:\*|.*\b(?:cookie|authorization)\b.*)$/i.test(response.headers.get('vary') ?? '')
  );
}

export async function matchesNavigation(response: Response, digest: string): Promise<boolean> {
  if (response.status !== 200 || response.type !== 'basic' || response.redirected) return false;
  const bytes = await crypto.subtle.digest('SHA-256', await response.clone().arrayBuffer());
  return btoa(String.fromCharCode(...new Uint8Array(bytes))) === digest;
}

export function createNavigationCache(options: {
  base: string;
  origin: string;
  version: string;
  manifest: NavigationManifest;
  update: () => Promise<void>;
}) {
  const { base, origin, version, manifest } = options;
  const metadata = new URL(`${base}/__navigation_manifest__`, origin).href;
  const clientMetadata = new URL(`${base}/__navigation_clients__`, origin).href;
  const names = (release: string) =>
    ['runtime', 'offline', 'precache'].map((kind) => `patternverse-${kind}-${release}`);
  const snapshots = new Map<string, NavigationManifest>([[version, manifest]]);
  let clients: Promise<Record<string, string>> | undefined;
  let writes = Promise.resolve();
  const clientVersions = () =>
    (clients ??= (async () => {
      const response = await (await caches.open(names(version)[2])).match(clientMetadata);
      return response ? await response.json() : {};
    })());
  const saveClients = async () => {
    writes = writes
      .catch(() => {})
      .then(async () => {
        await (
          await caches.open(names(version)[2])
        ).put(clientMetadata, new Response(JSON.stringify(await clientVersions())));
      });
    await writes;
  };
  const snapshot = async (release: string) => {
    if (snapshots.has(release)) return snapshots.get(release);
    const response = await (await caches.open(names(release)[2])).match(metadata);
    if (!response) return;
    const saved = await response.json();
    if (saved.version !== release) return;
    snapshots.set(release, saved.manifest);
    return saved.manifest as NavigationManifest;
  };
  const errorResponse = (request: Request, message: string, needsUpdate = false) => {
    const path = new URL(request.url).pathname.slice(base.length);
    const data = path.endsWith('/__data.json') || isLibrarySearchPath(path);
    return new Response(
      data
        ? JSON.stringify(message)
        : `<!doctype html><html lang="en"><meta name="viewport" content="width=device-width"><title>Update Patternverse</title><main><h1>Update Patternverse</h1><p>${message}</p><a href="">Reload this page</a></main></html>`,
      {
        status: 503,
        headers: {
          'content-type': data ? 'application/json' : 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          ...(needsUpdate ? { 'x-patternverse-update-required': '1' } : {}),
        },
      },
    );
  };
  const inFlight = new Map<string, Promise<Response>>();
  return {
    async install() {
      await (
        await caches.open(names(version)[2])
      ).put(metadata, new Response(JSON.stringify({ version, manifest })));
    },
    async inheritClients(retired: string[], live: string[]) {
      const registry = await clientVersions();
      for (const name of retired.filter((name) => name.startsWith('patternverse-precache-'))) {
        const response = await (await caches.open(name)).match(clientMetadata);
        if (response) Object.assign(registry, await response.json());
      }
      for (const id of Object.keys(registry)) if (!live.includes(id)) delete registry[id];
      // Legacy tabs cannot certify their generation. They retain immutable assets, but
      // must reload before receiving page data from a different application build.
      for (const id of live) registry[id] ??= 'legacy';
      if (live.length) await saveClients();
    },
    async registerClient(id: string, release: string, live: string[]) {
      if (!release || release.length > 200) return;
      const registry = await clientVersions();
      for (const known of Object.keys(registry)) if (!live.includes(known)) delete registry[known];
      registry[id] = release;
      await saveClients();
    },
    async clientVersion(id: string) {
      // A restarted worker must not guess the release of an unidentified old tab.
      return (await clientVersions())[id] ?? (id ? 'legacy' : version);
    },
    async store(url: string, response: Response, cacheName: string): Promise<boolean> {
      const key = navigationKey(new Request(url), manifest, base);
      if (!key || !manifest.pages[new URL(url).pathname.slice(base.length)]) return false;
      if (
        !storableResponse(response) ||
        !(await matchesNavigation(
          response,
          manifest.pages[new URL(url).pathname.slice(base.length)],
        ))
      )
        return false;
      await (await caches.open(cacheName)).put(key, response.clone());
      return true;
    },
    async respond(request: Request, release = version): Promise<Response | undefined> {
      let selected = await snapshot(release);
      if (!selected) {
        await options.update();
        // A fresh document may announce its build while that worker is installing.
        selected = await snapshot(release);
      }
      if (!selected) {
        return errorResponse(
          request,
          'Reload this page to continue. Save any unfinished work first.',
          true,
        );
      }
      const key = navigationKey(request, selected, base);
      if (!key) return;
      const path = new URL(key).pathname.slice(base.length);
      const redirect = selected.redirects[path];
      if (redirect) return Response.redirect(new URL(redirect.location, origin), redirect.status);
      const digest = selected.pages[path];
      let saved: Response | undefined;
      for (const name of names(release)) {
        const cache = await caches.open(name);
        const response = await cache.match(key);
        if (response && storableResponse(response) && (await matchesNavigation(response, digest))) {
          if (request.mode !== 'navigate') return response;
          saved = response;
          break;
        }
      }
      // Full loads get the deployed document; open tabs keep their certified page data.
      // A saved document remains available when the network cannot be reached.
      // Query strings remain on the fetch; canonical cache reuse is allowed only
      // for bytes matching this prerendered response, including SvelteKit invalidations.
      const pendingKey = `${release}:${request.mode}:${request.url}`;
      let pending = inFlight.get(pendingKey);
      if (!pending) {
        pending = (async () => {
          try {
            const response = await fetch(
              new Request(request, { cache: 'no-cache', signal: AbortSignal.timeout(15_000) }),
            );
            if (!response.ok) return response;
            if (!(await matchesNavigation(response, digest))) {
              await options.update();
              // A full navigation replaces the whole document and its bootstrap.
              // Let it open the deployed site, without saving new bytes in the old
              // release. In-app data requests still require their tab's snapshot.
              if (request.mode === 'navigate') return response;
              return errorResponse(
                request,
                'Reload this page to continue. Save any unfinished work first.',
                true,
              );
            }
            if (storableResponse(response)) {
              try {
                await (await caches.open(names(release)[0])).put(key, response.clone());
              } catch {
                /* Online reading works even when storage is full. */
              }
            }
            return response;
          } catch {
            if (saved) return saved;
            if (request.mode === 'navigate')
              return Response.redirect(new URL(`${base}/offline.html`, origin), 302);
            return errorResponse(
              request,
              'This page is not saved for offline use. Reconnect and try again.',
            );
          }
        })().finally(() => {
          inFlight.delete(pendingKey);
        });
        inFlight.set(pendingKey, pending);
      }
      return (await pending).clone();
    },
  };
}

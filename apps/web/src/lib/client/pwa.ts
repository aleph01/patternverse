import { readable, writable } from 'svelte/store';
import { base } from '$app/paths';
import { dev, version } from '$app/environment';

export const offlineDownload = writable({ state: 'idle', completed: 0, total: 0 });

/** Keep one scope while bypassing a CDN's older copy of the worker script. */
export async function registerPwaWorker(): Promise<void> {
  if (dev || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register(
      `${base}/service-worker.js?version=${encodeURIComponent(version)}`,
      { scope: `${base}/`, updateViaCache: 'none' },
    );
  } catch {
    // An offline return visit keeps its existing worker and cached release.
  }
}

export function downloadOfflineLibrary(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'DOWNLOAD_OFFLINE', version });
}

export function cancelOfflineDownload(): void {
  navigator.serviceWorker.controller?.postMessage({ type: 'CANCEL_OFFLINE' });
}

let announcedController: ServiceWorker | undefined;
export function trackClientVersion(): () => void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker) return () => {};
  const announce = () => {
    const controller = navigator.serviceWorker.controller;
    if (!controller || announcedController === controller) return;
    announcedController = controller;
    controller.postMessage({ type: 'CLIENT_VERSION', version });
  };
  announce();
  void navigator.serviceWorker.ready.then(announce);
  navigator.serviceWorker.addEventListener('controllerchange', announce);
  return () => navigator.serviceWorker.removeEventListener('controllerchange', announce);
}

/** Only resources already used by this visit are warmed automatically. */
export function cacheCurrentVisit(): void {
  if (typeof navigator === 'undefined' || !navigator.serviceWorker?.controller) return;
  const connection = (
    navigator as Navigator & {
      connection?: { saveData?: boolean; effectiveType?: string };
    }
  ).connection;
  if (
    !navigator.onLine ||
    document.visibilityState === 'hidden' ||
    connection?.saveData ||
    connection?.effectiveType === 'slow-2g' ||
    connection?.effectiveType === '2g'
  )
    return;
  const url = new URL(location.href);
  url.search = '';
  url.hash = '';
  const pathname = url.pathname.replace(/\/$/, '');
  const data = `${pathname}/__data.json`;
  const resources = performance
    .getEntriesByType('resource')
    .slice(-120)
    .map((entry) => entry.name);
  navigator.serviceWorker.controller.postMessage({
    type: 'CACHE_VISIT',
    paths: [url.href, data, ...resources],
  });
}

export type PwaState = {
  readonly online: boolean;
  readonly offlineReady: boolean;
  readonly reloadRequired: boolean;
};

const initialState: PwaState = {
  online: true,
  offlineReady: false,
  reloadRequired: false,
};

let waitingRegistration: ServiceWorkerRegistration | undefined;
let applyingUpdate = false;

export const pwaState = readable<PwaState>(initialState, (set) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  let state: PwaState = { ...initialState, online: navigator.onLine };
  const update = (next: Partial<PwaState>) => {
    state = { ...state, ...next };
    set(state);
  };
  const probeConnectivity = async (): Promise<void> => {
    if (!navigator.onLine) {
      update({ online: false });
      return;
    }
    try {
      const response = await fetch(`${base}/manifest.webmanifest?network-probe=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'x-patternverse-network-probe': '1' },
      });
      update({ online: response.ok });
    } catch {
      update({ online: false });
    }
  };
  const updateConnectivity = () => void probeConnectivity();
  const watchInstallingWorker = (registration: ServiceWorkerRegistration) => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      if (installing.state !== 'installed') return;
      if (navigator.serviceWorker.controller) {
        // Activate quietly; an open document keeps its own release until a full load.
        registration.waiting?.postMessage({ type: 'SKIP_WAITING' });
      } else {
        update({ offlineReady: true });
      }
    });
  };
  const controllerChanged = () => {
    update({ offlineReady: true });
    if (applyingUpdate) window.location.reload();
    else cacheCurrentVisit();
    navigator.serviceWorker.controller?.postMessage({ type: 'OFFLINE_STATUS', version });
  };
  const workerMessage = (event: MessageEvent) => {
    if (event.data?.type === 'NETWORK_STATUS' && typeof event.data.online === 'boolean') {
      update({ online: event.data.online });
    }
    if (event.data?.type === 'OFFLINE_DOWNLOAD') {
      if (event.data.version !== version) return;
      offlineDownload.set({
        state: event.data.state,
        completed: event.data.completed,
        total: event.data.total,
      });
    }
    if (
      event.data?.type === 'UPDATE_REQUIRED' &&
      (event.data.reason === 'navigation' || event.data.reason === 'offline-download')
    ) {
      // Routine version differences (including messages from older workers) stay silent.
      // Only a failed user request needs an explicit recovery action.
      update({ reloadRequired: true });
      offlineDownload.update((download) =>
        download.state === 'downloading' ? { ...download, state: 'paused' } : download,
      );
      void navigator.serviceWorker.getRegistration().then((registration) => {
        if (!registration) return;
        waitingRegistration = registration;
        if (registration.installing) watchInstallingWorker(registration);
      });
    }
  };

  window.addEventListener('online', updateConnectivity);
  window.addEventListener('offline', updateConnectivity);
  navigator.serviceWorker.addEventListener('controllerchange', controllerChanged);
  navigator.serviceWorker.addEventListener('message', workerMessage);
  void probeConnectivity();

  void navigator.serviceWorker.ready.then((registration) => {
    update({ offlineReady: Boolean(navigator.serviceWorker.controller) });
    if (registration.waiting && navigator.serviceWorker.controller) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    watchInstallingWorker(registration);
    registration.addEventListener('updatefound', () => watchInstallingWorker(registration));
    navigator.serviceWorker.controller?.postMessage({ type: 'OFFLINE_STATUS', version });
    cacheCurrentVisit();
  });

  return () => {
    window.removeEventListener('online', updateConnectivity);
    window.removeEventListener('offline', updateConnectivity);
    navigator.serviceWorker.removeEventListener('controllerchange', controllerChanged);
    navigator.serviceWorker.removeEventListener('message', workerMessage);
  };
});

export const applyPwaUpdate = (): void => {
  const waiting = waitingRegistration?.waiting;
  if (!waiting) {
    // The worker may already have activated. This tab still waits for an
    // explicit action before replacing an open editing session.
    if (waitingRegistration?.active) window.location.reload();
    return;
  }
  applyingUpdate = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
};

import { readable } from 'svelte/store';
import { base } from '$app/paths';

export type PwaState = {
  readonly online: boolean;
  readonly offlineReady: boolean;
  readonly updateReady: boolean;
};

const initialState: PwaState = {
  online: true,
  offlineReady: false,
  updateReady: false,
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
        waitingRegistration = registration;
        update({ updateReady: true });
      } else {
        update({ offlineReady: true });
      }
    });
  };
  const controllerChanged = () => {
    update({ offlineReady: true });
    if (applyingUpdate) window.location.reload();
  };
  const workerMessage = (event: MessageEvent) => {
    if (event.data?.type === 'NETWORK_STATUS' && typeof event.data.online === 'boolean') {
      update({ online: event.data.online });
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
      waitingRegistration = registration;
      update({ updateReady: true });
    }
    registration.addEventListener('updatefound', () => watchInstallingWorker(registration));
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
  if (!waiting) return;
  applyingUpdate = true;
  waiting.postMessage({ type: 'SKIP_WAITING' });
};

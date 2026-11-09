import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  applyPwaUpdate,
  cacheCurrentVisit,
  pwaState,
  offlineDownload,
  registerPwaWorker,
} from './pwa';
import { get } from 'svelte/store';

vi.mock('$app/paths', () => ({ base: '' }));
vi.mock('$app/environment', () => ({ dev: false, version: 'new' }));

afterEach(() => vi.unstubAllGlobals());

it('registers the current release through an uncached URL in the existing scope', async () => {
  const register = vi.fn(async () => ({}));
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', { serviceWorker: { register } });
  await registerPwaWorker();
  expect(register).toHaveBeenCalledExactlyOnceWith('/service-worker.js?version=new', {
    scope: '/',
    updateViaCache: 'none',
  });
});

it('keeps an offline return visit usable when registration cannot reach the network', async () => {
  const controller = { postMessage: vi.fn() };
  const register = vi.fn().mockRejectedValue(new Error('Offline'));
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', { serviceWorker: { register, controller } });
  await expect(registerPwaWorker()).resolves.toBeUndefined();
  expect(navigator.serviceWorker.controller).toBe(controller);
});

it('does not register in browsers without service worker support', async () => {
  vi.stubGlobal('window', {});
  vi.stubGlobal('navigator', {});
  await expect(registerPwaWorker()).resolves.toBeUndefined();
});

function setup(
  options: { online?: boolean; hidden?: boolean; saveData?: boolean; effectiveType?: string } = {},
) {
  const postMessage = vi.fn();
  vi.stubGlobal('navigator', {
    onLine: options.online ?? true,
    connection: { saveData: options.saveData, effectiveType: options.effectiveType },
    serviceWorker: { controller: { postMessage } },
  });
  vi.stubGlobal('document', { visibilityState: options.hidden ? 'hidden' : 'visible' });
  vi.stubGlobal('location', {
    href: 'https://patternverse.example/pattern/example?view=reading#section',
  });
  vi.stubGlobal('performance', {
    getEntriesByType: () => [{ name: 'https://patternverse.example/_app/immutable/app.js' }],
  });
  return postMessage;
}

describe('automatic visit caching', () => {
  it('warms the visited document, navigation data, and already loaded resources', () => {
    const postMessage = setup();
    cacheCurrentVisit();
    expect(postMessage).toHaveBeenCalledWith({
      type: 'CACHE_VISIT',
      paths: [
        'https://patternverse.example/pattern/example',
        '/pattern/example/__data.json',
        'https://patternverse.example/_app/immutable/app.js',
      ],
    });
  });

  it.each([
    { online: false },
    { hidden: true },
    { saveData: true },
    { effectiveType: '2g' },
    { effectiveType: 'slow-2g' },
  ])('avoids extra downloads for %j', (options) => {
    const postMessage = setup(options);
    cacheCurrentVisit();
    expect(postMessage).not.toHaveBeenCalled();
  });

  it('does nothing before a worker controls the page', () => {
    vi.stubGlobal('navigator', { serviceWorker: {} });
    expect(() => cacheCurrentVisit()).not.toThrow();
  });
});

it('activates a waiting update quietly without replacing the open document', async () => {
  const reload = vi.fn();
  const listeners = new Map<string, () => void>();
  const registration: {
    waiting: { postMessage: ReturnType<typeof vi.fn> } | null;
    active: object;
    addEventListener: ReturnType<typeof vi.fn>;
  } = {
    waiting: { postMessage: vi.fn() },
    active: {},
    addEventListener: vi.fn(),
  };
  vi.stubGlobal('window', {
    location: { reload },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('navigator', {
    onLine: false,
    serviceWorker: {
      controller: { postMessage: vi.fn() },
      ready: Promise.resolve(registration),
      addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
      removeEventListener: vi.fn(),
    },
  });
  vi.stubGlobal('document', { visibilityState: 'hidden' });
  let reloadRequired = false;
  const unsubscribe = pwaState.subscribe((state) => {
    reloadRequired = state.reloadRequired;
  });
  await vi.waitFor(() => expect(registration.waiting!.postMessage).toHaveBeenCalledOnce());
  expect(registration.waiting!.postMessage).toHaveBeenCalledExactlyOnceWith({
    type: 'SKIP_WAITING',
  });
  registration.waiting = null;
  listeners.get('controllerchange')!();
  expect(reloadRequired).toBe(false);
  expect(reload).not.toHaveBeenCalled();
  unsubscribe();
});

it('activates an update already installing at startup without reloading the document', async () => {
  const reload = vi.fn();
  const listeners = new Map<string, (event: MessageEvent) => void>();
  const installing = { state: 'installing', addEventListener: vi.fn() };
  const waiting = { postMessage: vi.fn() };
  const registration = {
    installing,
    waiting: null as typeof waiting | null,
    addEventListener: vi.fn(),
  };
  vi.stubGlobal('window', {
    location: { reload },
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  });
  vi.stubGlobal('document', { visibilityState: 'hidden' });
  vi.stubGlobal('navigator', {
    onLine: false,
    serviceWorker: {
      controller: { postMessage: vi.fn() },
      ready: Promise.resolve(registration),
      addEventListener: (type: string, listener: (event: MessageEvent) => void) =>
        listeners.set(type, listener),
      removeEventListener: vi.fn(),
    },
  });
  let reloadRequired = false;
  const unsubscribe = pwaState.subscribe((state) => {
    reloadRequired = state.reloadRequired;
  });
  await vi.waitFor(() => expect(installing.addEventListener).toHaveBeenCalledOnce());
  installing.state = 'installed';
  registration.waiting = waiting;
  installing.addEventListener.mock.calls[0][1]();
  expect(waiting.postMessage).toHaveBeenCalledExactlyOnceWith({ type: 'SKIP_WAITING' });
  expect(reloadRequired).toBe(false);
  listeners.get('controllerchange')!({} as MessageEvent);
  listeners.get('message')!({
    data: { type: 'OFFLINE_DOWNLOAD', version: 'new', state: 'idle', completed: 0, total: 0 },
  } as MessageEvent);
  expect(reloadRequired).toBe(false);
  expect(reload).not.toHaveBeenCalled();
  unsubscribe();
});

it.each(['navigation', 'offline-download'])(
  'only offers a reload when a user request requires it (%s)',
  async (reason) => {
    const reload = vi.fn();
    const listeners = new Map<string, (event: MessageEvent) => void>();
    const registration = { waiting: null, active: {}, addEventListener: vi.fn() };
    vi.stubGlobal('window', {
      location: { reload },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
    vi.stubGlobal('document', { visibilityState: 'hidden' });
    vi.stubGlobal('navigator', {
      onLine: false,
      serviceWorker: {
        controller: { postMessage: vi.fn() },
        ready: Promise.resolve(registration),
        getRegistration: async () => registration,
        addEventListener: (type: string, listener: (event: MessageEvent) => void) =>
          listeners.set(type, listener),
        removeEventListener: vi.fn(),
      },
    });
    offlineDownload.set({ state: 'idle', completed: 0, total: 0 });
    let reloadRequired = false;
    const unsubscribe = pwaState.subscribe((state) => {
      reloadRequired = state.reloadRequired;
    });
    listeners.get('message')!({
      data: {
        type: 'OFFLINE_DOWNLOAD',
        version: 'future',
        state: 'complete',
        completed: 100,
        total: 100,
      },
    } as MessageEvent);
    expect(get(offlineDownload).state).toBe('idle');
    listeners.get('message')!({
      data: { type: 'UPDATE_REQUIRED', version: 'future' },
    } as MessageEvent);
    await vi.waitFor(() => expect(registration.addEventListener).toHaveBeenCalledOnce());
    expect(reloadRequired).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    listeners.get('message')!({
      data: { type: 'UPDATE_REQUIRED', version: 'future', reason },
    } as MessageEvent);
    await vi.waitFor(() => expect(reloadRequired).toBe(true));
    // A current-release status response must not hide a failed request's recovery action.
    listeners.get('message')!({
      data: { type: 'OFFLINE_DOWNLOAD', version: 'new', state: 'idle', completed: 0, total: 0 },
    } as MessageEvent);
    expect(reloadRequired).toBe(true);
    expect(reload).not.toHaveBeenCalled();
    applyPwaUpdate();
    expect(reload).toHaveBeenCalledOnce();
    unsubscribe();
  },
);

import { writable, type Readable } from 'svelte/store';

export const PREVIEW_QUERY = 'preview';
export const PREVIEW_SESSION_KEY = 'patternverse:preview';

export type PreviewState = Readonly<{ ready: boolean; enabled: boolean }>;
type SessionStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type PreviewMode = Readable<PreviewState> & {
  initialize(url: URL, storage: () => SessionStorage): void;
  navigate(url: URL): void;
  disable(): void;
};

/** One instance per root layout, never a mutable server-wide singleton. */
export function createPreviewMode(available = true): PreviewMode {
  const state = writable<PreviewState>({ ready: false, enabled: false });
  let initialized = false;
  let enabled = false;
  let storage: SessionStorage | undefined;

  function save(next: boolean) {
    enabled = available && next;
    try {
      if (enabled) storage?.setItem(PREVIEW_SESSION_KEY, '1');
      else storage?.removeItem(PREVIEW_SESSION_KEY);
    } catch {
      // Browsers can deny storage. In-memory navigation still works in this tab.
    }
    state.set({ ready: true, enabled });
  }

  function navigate(url: URL) {
    if (!initialized) return;
    const values = url.searchParams.getAll(PREVIEW_QUERY);
    // Accept only an unambiguous, explicit opt-in or opt-out.
    if (values.length === 1 && (values[0] === '1' || values[0] === '0')) {
      save(values[0] === '1');
    }
  }

  return {
    subscribe: state.subscribe,
    initialize(url, accessStorage) {
      if (initialized) return;
      initialized = true;
      let saved = false;
      try {
        storage = accessStorage();
        saved = storage.getItem(PREVIEW_SESSION_KEY) === '1';
      } catch {
        // The URL remains usable when session storage is unavailable.
      }
      save(saved);
      navigate(url);
    },
    navigate,
    disable() {
      if (initialized) save(false);
    },
  };
}

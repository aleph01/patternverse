import { get } from 'svelte/store';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { installedPwa } from './installed-pwa';

function mockWindow(options: { mode?: string; ios?: boolean; desktop?: boolean } = {}) {
  const queries = new Map<string, { matches: boolean; listeners: Set<() => void> }>();
  vi.stubGlobal('window', {
    navigator: { standalone: options.ios },
    ...(options.desktop ? { __TAURI_INTERNALS__: {} } : {}),
    matchMedia(query: string) {
      const state = {
        matches: query === `(display-mode: ${options.mode})`,
        listeners: new Set<() => void>(),
      };
      queries.set(query, state);
      return {
        get matches() {
          return state.matches;
        },
        addEventListener(_event: string, listener: () => void) {
          state.listeners.add(listener);
        },
        removeEventListener(_event: string, listener: () => void) {
          state.listeners.delete(listener);
        },
      };
    },
  });
  return queries;
}

afterEach(() => vi.unstubAllGlobals());

describe('installed PWA context', () => {
  it('does not label an ordinary browser tab as an installed app', () => {
    mockWindow();
    expect(get(installedPwa)).toBe(false);
  });

  it.each(['standalone', 'minimal-ui'])('recognizes %s app windows', (mode) => {
    mockWindow({ mode });
    expect(get(installedPwa)).toBe(true);
  });

  it('recognizes iOS home-screen launches', () => {
    mockWindow({ ios: true });
    expect(get(installedPwa)).toBe(true);
  });

  it('does not treat the native desktop app as a PWA', () => {
    mockWindow({ mode: 'standalone', desktop: true });
    expect(get(installedPwa)).toBe(false);
  });

  it('updates when display context changes and removes listeners', () => {
    const queries = mockWindow();
    const values: boolean[] = [];
    const unsubscribe = installedPwa.subscribe((value) => values.push(value));
    const standalone = queries.get('(display-mode: standalone)')!;
    standalone.matches = true;
    standalone.listeners.forEach((listener) => listener());
    expect(values.at(-1)).toBe(true);
    standalone.matches = false;
    standalone.listeners.forEach((listener) => listener());
    expect(values.at(-1)).toBe(false);
    unsubscribe();
    expect([...queries.values()].every((query) => query.listeners.size === 0)).toBe(true);
  });

  it('starts hidden during server rendering', () => {
    vi.stubGlobal('window', undefined);
    expect(get(installedPwa)).toBe(false);
  });
});

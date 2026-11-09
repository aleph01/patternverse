import { get } from 'svelte/store';
import { describe, expect, it } from 'vitest';
import { createPreviewMode, PREVIEW_SESSION_KEY } from './mode';

const url = (query = '') => new URL(`https://patternverse.org/${query}`);
function session(initial?: string) {
  const values = new Map(initial ? [[PREVIEW_SESSION_KEY, initial]] : []);
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => void values.set(key, value),
    removeItem: (key: string) => void values.delete(key),
  };
}

describe('shared preview mode', () => {
  it('starts hidden for prerendering and ordinary visits, without server state leaking', () => {
    const preview = createPreviewMode();
    preview.navigate(url('?preview=1'));
    expect(get(preview)).toEqual({ ready: false, enabled: false });
    preview.initialize(url(), () => session());
    expect(get(preview)).toEqual({ ready: true, enabled: false });
    preview.navigate(url('?preview=1'));
    expect(get(preview).enabled).toBe(true);
    expect(get(createPreviewMode()).enabled).toBe(false);
  });

  it('retains opt-in across navigation and reloads in the same tab, not fresh sessions', () => {
    const storage = session();
    const preview = createPreviewMode();
    preview.initialize(url('?verse=writing&preview=1#home-apps'), () => storage);
    preview.navigate(url('apps/bearings?situation=one'));
    expect(get(preview).enabled).toBe(true);
    const reloaded = createPreviewMode();
    reloaded.initialize(url('apps/bearings'), () => storage);
    expect(get(reloaded).enabled).toBe(true);
    const fresh = createPreviewMode();
    fresh.initialize(url(), () => session());
    expect(get(fresh).enabled).toBe(false);
  });

  it('clears the session through the exit action or an explicit URL opt-out', () => {
    const storage = session();
    const preview = createPreviewMode();
    preview.initialize(url('?preview=1'), () => storage);
    preview.disable();
    expect(get(preview).enabled).toBe(false);
    expect(storage.getItem(PREVIEW_SESSION_KEY)).toBeNull();
    preview.navigate(url('?preview=1'));
    preview.navigate(url('?preview=0'));
    expect(get(preview).enabled).toBe(false);
    const reload = createPreviewMode();
    reload.initialize(url(), () => storage);
    expect(get(reload).enabled).toBe(false);
  });

  it('ignores malformed, duplicate, and unrelated parameters', () => {
    for (const query of [
      '?preview',
      '?preview=true',
      '?preview=anything',
      '?preview=1&preview=0',
      '?Preview=1',
    ]) {
      const preview = createPreviewMode();
      preview.initialize(url(query), () => session());
      expect(get(preview).enabled).toBe(false);
    }
  });

  it('applies the deployment kill switch even to an existing preview session', () => {
    const storage = session('1');
    const preview = createPreviewMode(false);
    preview.initialize(url('?preview=1'), () => storage);
    preview.navigate(url('?preview=1'));
    expect(get(preview)).toEqual({ ready: true, enabled: false });
    expect(storage.getItem(PREVIEW_SESSION_KEY)).toBeNull();
  });

  it('keeps working when browser storage access or writes are denied', () => {
    const denied = () => {
      throw new Error('Storage denied');
    };
    for (const storage of [
      denied,
      () => ({ getItem: denied, setItem: denied, removeItem: denied }),
    ]) {
      const preview = createPreviewMode();
      preview.initialize(url('?preview=1'), storage);
      preview.navigate(url('library'));
      expect(get(preview).enabled).toBe(true);
      preview.disable();
      expect(get(preview).enabled).toBe(false);
    }
  });
});

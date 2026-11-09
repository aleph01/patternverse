import { describe, expect, it } from 'vitest';
import {
  downloadOfflineUrls,
  installationUrls,
  offlineUrls,
  precacheUrls,
} from './service-worker-cache';

const origin = 'https://patternverse.example';

describe('service-worker precache URLs', () => {
  it('stores the homepage only once despite prerendered section links', () => {
    expect(precacheUrls(['/', '/#home-about', '/#verses', '/'], origin)).toEqual([`${origin}/`]);
  });

  it('normalizes relative and absolute aliases before deduplicating', () => {
    expect(precacheUrls(['/my', `${origin}/my#backup`, '/library/../my'], origin)).toEqual([
      `${origin}/my`,
    ]);
  });

  it('preserves query parameters and distinct paths', () => {
    expect(precacheUrls(['/my?v=1#top', '/my?v=2', '/my?v=1', '/library'], origin)).toEqual([
      `${origin}/my?v=1`,
      `${origin}/my?v=2`,
      `${origin}/library`,
    ]);
  });

  it('preserves deployment base paths and input order without changing inputs', () => {
    const assets = Object.freeze(['/app/my#backup', '/app/', '/app/my', '/app/icon.svg']);
    expect(precacheUrls(assets, origin)).toEqual([
      `${origin}/app/my`,
      `${origin}/app/`,
      `${origin}/app/icon.svg`,
    ]);
    expect(assets[0]).toBe('/app/my#backup');
  });

  it('handles an empty asset list', () => {
    expect(precacheUrls([], origin)).toEqual([]);
  });
});

describe('lightweight offline installation', () => {
  it('keeps installation fixed as the catalog grows', () => {
    const content = Array.from({ length: 10_000 }, (_, i) => `/pattern/${i}`);
    expect(offlineUrls(content, origin, '')).toHaveLength(10_000);
    expect(installationUrls(origin, '')).toEqual([`${origin}/offline.html`]);
    expect(installationUrls(origin, '/app')).toEqual([`${origin}/app/offline.html`]);
  });

  it('excludes authentication, query credentials, external URLs, and hosting metadata', () => {
    expect(
      offlineUrls(
        [
          '/app/',
          '/app/auth/provider/callback',
          '/app/auth/provider/callback?code=secret',
          '/app/_headers',
          '/app/_redirects',
          '/app/library?token=secret',
          'https://external.example/app/image.png',
          '/outside',
          '/app/pattern/example#section',
        ],
        origin,
        '/app',
      ),
    ).toEqual([`${origin}/app/`, `${origin}/app/pattern/example`]);
  });
});

describe('optional offline downloads', () => {
  it('runs at most two requests concurrently and reports completion', async () => {
    let active = 0;
    let maximum = 0;
    const seen: string[] = [];
    const result = await downloadOfflineUrls(
      ['a', 'b', 'c', 'd', 'e'],
      async (url) => {
        active++;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 1));
        seen.push(url);
        active--;
      },
      new AbortController().signal,
      () => {},
    );
    expect(maximum).toBe(2);
    expect(seen).toHaveLength(5);
    expect(result).toEqual({ completed: 5, failed: 0 });
  });

  it('pauses on failure without scheduling or retrying the rest of the catalog', async () => {
    const seen: string[] = [];
    const result = await downloadOfflineUrls(
      ['a', 'b', 'c', 'd'],
      async (url) => {
        seen.push(url);
        throw new Error('Network unavailable');
      },
      new AbortController().signal,
      () => {},
    );
    expect(seen).toEqual(['a', 'b']);
    expect(result).toEqual({ completed: 0, failed: 2 });
  });

  it('stops scheduling after cancellation and can resume using cached results', async () => {
    const controller = new AbortController();
    const cached = new Set<string>();
    const requests: string[] = [];
    const download = async (url: string) => {
      if (!cached.has(url)) {
        requests.push(url);
        cached.add(url);
      }
    };
    await downloadOfflineUrls(['a', 'b', 'c', 'd'], download, controller.signal, () =>
      controller.abort(),
    );
    expect(requests).toEqual(['a', 'b']);
    const result = await downloadOfflineUrls(
      ['a', 'b', 'c', 'd'],
      download,
      new AbortController().signal,
      () => {},
    );
    expect(requests).toEqual(['a', 'b', 'c', 'd']);
    expect(result).toEqual({ completed: 4, failed: 0 });
  });

  it('does no work when already cancelled', async () => {
    const result = await downloadOfflineUrls(
      ['a'],
      async () => {
        throw new Error('Unexpected work');
      },
      AbortSignal.abort(),
      () => {},
    );
    expect(result).toEqual({ completed: 0, failed: 0 });
  });
});

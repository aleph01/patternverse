import { describe, expect, it } from 'vitest';
import { precacheUrls } from './service-worker-cache';

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

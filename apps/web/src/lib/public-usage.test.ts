import { describe, expect, it } from 'vitest';
import { isPublicUsagePage, usageSource } from './public-usage';

describe('public usage privacy boundary', () => {
  it('accepts published reading pages and excludes private screens and execution', () => {
    expect(isPublicUsagePage('/')).toBe(true);
    expect(
      isPublicUsagePage('/pattern/example', {
        type: 'pattern',
        id: 'example',
        status: 'published',
      }),
    ).toBe(true);
    for (const path of [
      '/my',
      '/mira',
      '/editor',
      '/owner/stats',
      '/auth/openrouter/callback',
      '/pattern/example/run',
      '/library?search=private',
    ])
      expect(isPublicUsagePage(path)).toBe(false);
    expect(
      isPublicUsagePage('/pattern/example', { type: 'pattern', id: 'example', status: 'draft' }),
    ).toBe(false);
  });
  it('stores only broad referrer categories', () => {
    expect(usageSource('https://www.google.com/search?q=private')).toBe('Search engine');
    expect(usageSource('https://reddit.com/r/private?token=secret')).toBe('Social or community');
    expect(usageSource('https://private.example/secret')).toBe('Other website');
    expect(usageSource('https://patternverse.org/my')).toBe('Direct or unknown');
    expect(usageSource('')).toBe('Direct or unknown');
    expect(usageSource('not a URL')).toBe('Direct or unknown');
  });
});

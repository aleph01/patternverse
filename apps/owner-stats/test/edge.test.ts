import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { resetDatabase } from './database.js';
import { createHandler, type Env } from '../src/worker.js';
import { readStats } from '../src/stats.js';

const settings = { ...env, COLLECTION_ENABLED: 'true', COLLECTION_MODE: 'edge' } as Env;
const excludedHeaders: Record<string, string>[] = [
  { DNT: '1' },
  { 'Sec-GPC': '1' },
  { 'Sec-Fetch-Mode': 'cors' },
  { 'Sec-Fetch-Dest': 'empty' },
  { 'User-Agent': 'HeadlessChrome' },
  { 'User-Agent': 'Googlebot' },
];
const navigation = (path = '/', changes: Record<string, string> = {}) =>
  new Request(`https://patternverse.org${path}`, {
    headers: {
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Dest': 'document',
      'User-Agent': 'Example browser',
      ...changes,
    },
  });
beforeEach(() => resetDatabase(settings.STATS));

describe('aggregate public arrivals at the edge', () => {
  it('preserves the original HTML bytes and headers and counts only a sanitized public path', async () => {
    const original = new Response('<html>Original site</html>', {
      headers: {
        'Content-Type': 'text/html',
        ETag: 'original-fingerprint',
        'Cache-Control': 'max-age=60',
      },
    });
    const origin = vi.fn<typeof fetch>(async () => original);
    const request = navigation('/library?search=private#private', {
      Referer: 'https://google.com/search?q=secret',
    });
    const response = await createHandler(undefined, origin)(request, settings);
    expect(response).toBe(original);
    expect(origin).toHaveBeenCalledWith(request);
    expect(await response.text()).toBe('<html>Original site</html>');
    expect(response.headers.get('ETag')).toBe('original-fingerprint');
    expect(response.headers.get('Cache-Control')).toBe('max-age=60');
    const stats = await readStats(settings.STATS, 7);
    expect(stats.today).toBe(1);
    expect(stats.pages).toEqual([{ path: '/library', views: 1 }]);
    expect(stats.sources).toEqual([{ source: 'Search engine', visits: 1 }]);
  });

  it.each([
    '/my',
    '/mira',
    '/editor',
    '/auth/openrouter/callback',
    '/pattern/private-id',
    '/pattern/example/run',
    '/_app/immutable/code.js',
    '/library/__data.json',
  ])('passes through %s without storing it', async (path) => {
    const origin = vi.fn<typeof fetch>(
      async () => new Response('Original', { headers: { 'Content-Type': 'text/html' } }),
    );
    expect((await createHandler(undefined, origin)(navigation(path), settings)).status).toBe(200);
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });

  it.each(excludedHeaders)(
    'does not count opt-outs, prefetches, or recognized bots: %j',
    async (headers) => {
      const origin = vi.fn<typeof fetch>(
        async () => new Response('Original', { headers: { 'Content-Type': 'text/html' } }),
      );
      await createHandler(undefined, origin)(navigation('/', headers), settings);
      expect((await readStats(settings.STATS, 7)).views).toBe(0);
    },
  );

  it('does not count redirects, errors or non-HTML content', async () => {
    for (const response of [
      new Response(null, { status: 302 }),
      new Response('Missing', { status: 404 }),
      Response.json({ original: true }),
    ]) {
      await createHandler(
        undefined,
        vi.fn<typeof fetch>(async () => response),
      )(navigation(), settings);
    }
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });

  it('ignores old client events in edge mode so they cannot double count', async () => {
    const response = await createHandler()(
      new Request('https://patternverse.org/api/usage', {
        method: 'POST',
        headers: { Origin: 'https://patternverse.org' },
        body: 'private body is not read',
      }),
      settings,
    );
    expect(response.status).toBe(204);
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });

  it('keeps the website available when counting fails', async () => {
    const original = new Response('Original', { headers: { 'Content-Type': 'text/html' } });
    const response = await createHandler(
      undefined,
      vi.fn<typeof fetch>(async () => original),
    )(navigation(), { ...settings, STATS: undefined } as unknown as Env);
    expect(response).toBe(original);
  });

  it('does not count while disabled or accept forged owner identities', async () => {
    const origin = vi.fn<typeof fetch>(
      async () => new Response('Original', { headers: { 'Content-Type': 'text/html' } }),
    );
    const app = createHandler(undefined, origin);
    await app(navigation(), { ...settings, COLLECTION_ENABLED: 'false' });
    const response = await app(
      navigation('/owner/stats', {
        'Cf-Access-Authenticated-User-Email': 'contact@patternverse.org',
        'Cf-Access-Jwt-Assertion': 'forged',
      }),
      settings,
    );
    expect(response.status).toBe(403);
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });
});

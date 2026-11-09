import { env } from 'cloudflare:workers';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { resetDatabase } from './database.js';
import worker, { createHandler, type Env } from '../src/worker.js';
import { authorizeOwner } from '../src/access.js';
import { readStats } from '../src/stats.js';
import { dashboard } from '../src/dashboard.js';

const settings = {
  ...env,
  COLLECTION_ENABLED: 'true',
  COLLECTION_MODE: 'client',
  OWNER_EMAIL: 'contact@patternverse.org',
  ACCESS_TEAM_DOMAIN: 'patternverse-test.cloudflareaccess.com',
  ACCESS_AUD: 'test-audience',
} as Env;
const handler = createHandler();
const event = (
  body: unknown = { path: '/', entry: true, source: 'Direct or unknown' },
  origin = 'https://patternverse.org',
) =>
  new Request('https://patternverse.org/api/usage', {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => resetDatabase(settings.STATS));

describe('cookieless aggregate statistics', () => {
  it('counts public views and document entries separately, without saving events or identifiers', async () => {
    expect((await handler(event(), settings)).status).toBe(204);
    expect(
      (await handler(event({ path: '/library', entry: false, source: null }), settings)).status,
    ).toBe(204);
    const stats = await readStats(settings.STATS, 7);
    expect(stats.today).toBe(1);
    expect(stats.views).toBe(2);
    expect(stats.pages).toEqual([
      { path: '/', views: 1 },
      { path: '/library', views: 1 },
    ]);
    expect(stats.sources).toEqual([{ source: 'Direct or unknown', visits: 1 }]);
  });

  it.each([
    '/my',
    '/mira',
    '/editor',
    '/owner/stats',
    '/auth/dropbox/callback',
    '/pattern/unknown-private-id',
    '/library?search=private',
    '/library#private',
  ])('rejects private, unknown and unnormalised paths: %s', async (path) => {
    expect(
      (await handler(event({ path, entry: true, source: 'Direct or unknown' }), settings)).status,
    ).toBe(400);
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });

  it('rejects foreign origins, arbitrary source data, extra fields, large payloads and opt-outs', async () => {
    expect((await handler(event(undefined, 'https://foreign.example'), settings)).status).toBe(403);
    expect(
      (
        await handler(
          event({ path: '/', entry: true, source: 'https://example.com/private' }),
          settings,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await handler(
          event({ path: '/', entry: true, source: 'Direct or unknown', answer: 'private' }),
          settings,
        )
      ).status,
    ).toBe(400);
    expect((await handler(event('x'.repeat(600)), settings)).status).toBe(413);
    for (const header of ['DNT', 'Sec-GPC']) {
      const request = event();
      request.headers.set(header, '1');
      expect((await handler(request, settings)).status).toBe(204);
    }
    expect((await handler(event(), { ...settings, COLLECTION_ENABLED: 'false' })).status).toBe(204);
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });

  it('enforces transient abuse limits without recording denied requests', async () => {
    const limit = vi.fn(async () => ({ success: false }));
    expect((await handler(event(), { ...settings, USAGE_LIMITER: { limit } })).status).toBe(429);
    expect((await readStats(settings.STATS, 7)).views).toBe(0);
  });

  it('removes aggregate records older than 180 days', async () => {
    await settings.STATS.prepare("INSERT INTO daily_usage VALUES ('2000-01-01', 1, 1)").run();
    await handler(event(), settings);
    await worker.scheduled({} as ScheduledController, settings);
    const result = await settings.STATS.prepare('SELECT * FROM daily_usage').all();
    expect(result.results).toHaveLength(1);
    expect(result.results[0]!.day).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('owner-only dashboard', () => {
  it.each(['/owner/stats', '/owner/stats/', '/owner/stats/data', '/owner/stats?days=7'])(
    'denies unauthenticated access to %s before reading the database',
    async (path) => {
      const noDatabase = { ...settings, STATS: undefined } as unknown as Env;
      const response = await handler(
        new Request(`https://patternverse.org${path}`, {
          headers: { 'Cf-Access-Authenticated-User-Email': settings.OWNER_EMAIL },
        }),
        noDatabase,
      );
      expect(response.status).toBe(403);
      expect(response.headers.get('cache-control')).toContain('no-store');
    },
  );

  it('denies alternate hosts even with an accepted identity', async () => {
    const response = await createHandler(async () => true)(
      new Request('https://preview.workers.dev/owner/stats'),
      settings,
    );
    expect(response.status).toBe(404);
  });

  it('serves private HTML and JSON only after authorisation, and rejects unbounded periods', async () => {
    const allowed = createHandler(async () => true);
    await handler(event(), settings);
    for (const path of ['/owner/stats', '/owner/stats/data']) {
      const response = await allowed(new Request(`https://patternverse.org${path}`), settings);
      expect(response.status).toBe(200);
      expect(response.headers.get('cache-control')).toContain('no-store');
      expect(response.headers.get('content-security-policy')).toContain("frame-ancestors 'none'");
      expect(response.headers.get('set-cookie')).toBeNull();
    }
    expect(
      (await allowed(new Request('https://patternverse.org/owner/stats?days=900'), settings))
        .status,
    ).toBe(400);
    const stats = await readStats(settings.STATS, 7);
    stats.pages = [{ path: '<script>private</script>', views: 1 }];
    expect(dashboard(stats)).not.toContain('<script>private');
    expect(dashboard(stats)).toContain('&lt;script&gt;');
  });

  it('shows an unavailable error instead of false zero counts when the database fails', async () => {
    const allowed = createHandler(async () => true);
    const response = await allowed(new Request('https://patternverse.org/owner/stats'), {
      ...settings,
      STATS: undefined,
    } as unknown as Env);
    expect(response.status).toBe(503);
  });
});

describe('Access JWT verification', () => {
  it('requires a valid signature, owner email, audience, issuer and expiry', async () => {
    const { privateKey, publicKey } = await generateKeyPair('RS256');
    const jwk = { ...(await exportJWK(publicKey)), kid: 'test-key', alg: 'RS256', use: 'sig' };
    const fetchKeys = vi.fn(async () => Response.json({ keys: [jwk] })) as unknown as typeof fetch;
    async function check(
      options: { email?: string; audience?: string; issuer?: string; expiry?: number } = {},
    ) {
      const token = await new SignJWT({ email: options.email ?? settings.OWNER_EMAIL })
        .setProtectedHeader({ alg: 'RS256', kid: 'test-key' })
        .setSubject('test-owner')
        .setIssuer(options.issuer ?? `https://${settings.ACCESS_TEAM_DOMAIN}`)
        .setAudience(options.audience ?? settings.ACCESS_AUD)
        .setIssuedAt()
        .setExpirationTime(options.expiry ?? Math.floor(Date.now() / 1000) + 120)
        .sign(privateKey);
      return authorizeOwner(
        new Request('https://patternverse.org/owner/stats', {
          headers: { 'Cf-Access-Jwt-Assertion': token },
        }),
        settings,
        fetchKeys,
      );
    }
    expect(await check()).toBe(true);
    expect(await check({ email: 'other@example.com' })).toBe(false);
    expect(await check({ audience: 'wrong-app' })).toBe(false);
    expect(await check({ issuer: 'https://attacker.example' })).toBe(false);
    expect(await check({ expiry: 1 })).toBe(false);
    expect(
      await authorizeOwner(
        new Request('https://patternverse.org/owner/stats', {
          headers: { 'Cf-Access-Jwt-Assertion': 'forged' },
        }),
        settings,
        fetchKeys,
      ),
    ).toBe(false);
    expect(
      await authorizeOwner(
        new Request('https://patternverse.org/owner/stats'),
        { ...settings, ACCESS_AUD: '' },
        fetchKeys,
      ),
    ).toBe(false);
  });
});

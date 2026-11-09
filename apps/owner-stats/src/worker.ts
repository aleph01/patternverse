import publicPaths from '../dist/public-paths.json' with { type: 'json' };
import { usageSources, usageSource } from '../../web/src/lib/public-usage.js';
import { authorizeOwner, type AccessSettings } from './access.js';
import { dashboard } from './dashboard.js';
import { readStats } from './stats.js';
import { countryCode } from './geography.js';

export interface Env extends AccessSettings {
  STATS: D1Database;
  COLLECTION_ENABLED: string;
  COLLECTION_MODE?: string;
  USAGE_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> };
}

const origins = new Set(['https://patternverse.org', 'https://www.patternverse.org']);
const paths = new Set<string>(publicPaths);
const headers = {
  'Cache-Control': 'private, no-store, max-age=0',
  'X-Robots-Tag': 'noindex, nofollow, noarchive',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'",
  Vary: 'Cookie, Cf-Access-Jwt-Assertion',
};
const respond = (body: string | null, status = 200, type = 'text/plain; charset=utf-8') =>
  new Response(body, { status, headers: { ...headers, 'Content-Type': type } });

async function collect(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return respond(null, 405);
  if (!origins.has(request.headers.get('Origin') ?? '')) return respond(null, 403);
  // Edge mode does not accept browser events, including events from an older web build.
  if (env.COLLECTION_MODE === 'edge') return respond(null, 204);
  if (
    env.COLLECTION_ENABLED !== 'true' ||
    request.headers.get('DNT') === '1' ||
    request.headers.get('Sec-GPC') === '1'
  )
    return respond(null, 204);
  if (request.headers.get('Content-Type') !== 'application/json') return respond(null, 415);
  // Limit the body while streaming: Content-Length can be absent or forged.
  const reader = request.body?.getReader();
  if (!reader) return respond(null, 400);
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    length += part.value.length;
    if (length > 512) {
      await reader.cancel();
      return respond(null, 413);
    }
    chunks.push(part.value);
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  let event: { path?: unknown; entry?: unknown; source?: unknown };
  try {
    event = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return respond(null, 400);
  }
  if (
    !event ||
    typeof event !== 'object' ||
    Object.keys(event).some((key) => !['path', 'entry', 'source'].includes(key)) ||
    typeof event.path !== 'string' ||
    !paths.has(event.path) ||
    typeof event.entry !== 'boolean' ||
    (event.entry ? !usageSources.some((source) => source === event.source) : event.source !== null)
  )
    return respond(null, 400);
  // This key is used transiently by Cloudflare's abuse limiter, never stored in the analytics DB.
  if (
    env.USAGE_LIMITER &&
    !(await env.USAGE_LIMITER.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' }))
      .success
  )
    return respond(null, 429);
  await recordUsage(
    env,
    event as { path: string; entry: boolean; source: string | null },
    countryCode(request.cf?.country),
  );
  return respond(null, 204);
}

async function recordUsage(
  env: Env,
  event: { path: string; entry: boolean; source: string | null },
  country: string,
): Promise<void> {
  const day = new Date().toISOString().slice(0, 10);
  const statements = [
    env.STATS.prepare(
      'INSERT INTO daily_usage (day, visits, views) VALUES (?, ?, 1) ON CONFLICT(day) DO UPDATE SET visits = visits + excluded.visits, views = views + 1',
    ).bind(day, event.entry ? 1 : 0),
    env.STATS.prepare(
      'INSERT INTO page_usage (day, path, views) VALUES (?, ?, 1) ON CONFLICT(day, path) DO UPDATE SET views = views + 1',
    ).bind(day, event.path),
  ];
  if (event.entry)
    statements.push(
      env.STATS.prepare(
        'INSERT INTO source_usage (day, source, visits) VALUES (?, ?, 1) ON CONFLICT(day, source) DO UPDATE SET visits = visits + 1',
      ).bind(day, event.source),
      env.STATS.prepare(
        'INSERT INTO country_usage (day, country, visits) VALUES (?, ?, 1) ON CONFLICT(day, country) DO UPDATE SET visits = visits + 1',
      ).bind(day, country),
    );
  await env.STATS.batch(statements);
}

export function createHandler(authorize = authorizeOwner, originFetch: typeof fetch = fetch) {
  return async (request: Request, env: Env, ctx?: ExecutionContext): Promise<Response> => {
    const url = new URL(request.url);
    if (!origins.has(url.origin)) return respond(null, 404);
    try {
      if (url.pathname === '/api/usage') return await collect(request, env);
      if (!/^\/owner(?:\/|$)/.test(url.pathname)) {
        // Same-zone route fetches reach Pages. Preserve the response bytes and cache headers.
        const response = await originFetch(request);
        const path = url.pathname.replace(/\/$/, '') || '/';
        if (
          env.COLLECTION_ENABLED === 'true' &&
          env.COLLECTION_MODE === 'edge' &&
          request.method === 'GET' &&
          paths.has(path) &&
          response.status === 200 &&
          response.headers.get('Content-Type')?.includes('text/html') &&
          request.headers.get('Sec-Fetch-Mode') === 'navigate' &&
          request.headers.get('Sec-Fetch-Dest') === 'document' &&
          request.headers.get('DNT') !== '1' &&
          request.headers.get('Sec-GPC') !== '1' &&
          !/bot|crawler|spider|headless|preview|lighthouse|curl|wget/i.test(
            request.headers.get('User-Agent') ?? '',
          )
        ) {
          const count = (async () => {
            if (
              env.USAGE_LIMITER &&
              !(
                await env.USAGE_LIMITER.limit({
                  key: request.headers.get('CF-Connecting-IP') ?? 'unknown',
                })
              ).success
            )
              return;
            await recordUsage(
              env,
              {
                path,
                entry: true,
                source: usageSource(request.headers.get('Referer') ?? ''),
              },
              countryCode(request.cf?.country),
            );
          })().catch(() => {}); // Counting failures must never interrupt the website.
          if (ctx) ctx.waitUntil(count);
          else await count;
        }
        return response;
      }
      // Authorize before reading data, serving HTML, or revealing setup details.
      if (!(await authorize(request, env))) return respond('Owner sign-in required.', 403);
      if (request.method !== 'GET') return respond(null, 405);
      if (!['/owner/stats', '/owner/stats/', '/owner/stats/data'].includes(url.pathname))
        return respond(null, 404);
      if (env.COLLECTION_ENABLED !== 'true')
        return respond('Statistics collection is not active yet.', 503);
      const value = url.searchParams.get('days');
      if (value !== null && !['7', '30'].includes(value))
        return respond('Choose 7 or 30 days.', 400);
      const stats = await readStats(env.STATS, value === '7' ? 7 : 30);
      return url.pathname === '/owner/stats/data'
        ? respond(JSON.stringify(stats), 200, 'application/json')
        : respond(dashboard(stats), 200, 'text/html; charset=utf-8');
    } catch {
      // Never log request bodies, connection addresses, tokens, database details or user content.
      return respond('Statistics are temporarily unavailable. Please try again later.', 503);
    }
  };
}

export default {
  fetch: createHandler(),
  async scheduled(_event: ScheduledController, env: Env): Promise<void> {
    const cutoff = new Date(Date.now() - 179 * 86400000).toISOString().slice(0, 10);
    await env.STATS.batch(
      ['daily_usage', 'page_usage', 'source_usage', 'country_usage'].map((table) =>
        env.STATS.prepare(`DELETE FROM ${table} WHERE day < ?`).bind(cutoff),
      ),
    );
  },
} satisfies ExportedHandler<Env>;

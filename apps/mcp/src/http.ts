import { createMcpHandler, preloadSchemas } from '@modelcontextprotocol/server';
import { createPatternServer } from './server.js';
import type { PublicLibrary } from './library.js';
import type { PracticeWidget } from './widget.js';

// SDK-supported warm-up: wire schema construction belongs to isolate startup, not request CPU.
preloadSchemas();

export type HttpEnvironment = Pick<Env, 'MCP_RATE_LIMIT'>;
const origins = new Set([
  'https://patternverse.org',
  'https://chatgpt.com',
  'https://chat.openai.com',
]);
const hosts = new Set(['patternverse.org', 'localhost', '127.0.0.1']);

/** Transport/security adapter only; one SDK factory serves modern and legacy HTTP. */
export function createHttpEndpoint(library: PublicLibrary, widget?: PracticeWidget) {
  return async (request: Request, env: HttpEnvironment): Promise<Response> => {
    const url = new URL(request.url);
    const origin = request.headers.get('Origin');
    const respond = (body: string | null, status: number, extra?: HeadersInit) => {
      const headers = new Headers(extra);
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Content-Type-Options', 'nosniff');
      if (origin && origins.has(origin)) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
        headers.set('Access-Control-Allow-Methods', 'POST, GET, DELETE, OPTIONS');
        headers.set(
          'Access-Control-Allow-Headers',
          'Content-Type, Accept, MCP-Protocol-Version, MCP-Session-Id',
        );
        headers.set(
          'Access-Control-Expose-Headers',
          'MCP-Protocol-Version, MCP-Session-Id, Retry-After',
        );
      }
      return new Response(body, { status, headers });
    };
    if (url.pathname !== '/mcp' && url.pathname !== '/mcp/') return respond('Not found', 404);
    if (!hosts.has(url.hostname) || (origin !== null && !origins.has(origin)))
      return respond('Forbidden', 403);
    try {
      // Cloudflare supplies this header; never trust a caller's forwarded IP header.
      const key = `patternverse-mcp:${request.headers.get('CF-Connecting-IP') ?? 'unknown'}`;
      if (!(await env.MCP_RATE_LIMIT.limit({ key })).success)
        return respond('Too many requests', 429, { 'Retry-After': '60' });
      if (request.method === 'OPTIONS') return respond(null, 204);
      if (!['POST', 'GET', 'DELETE'].includes(request.method))
        return respond('Method not allowed', 405, { Allow: 'POST, GET, DELETE, OPTIONS' });
      // Fresh handler and server per exchange; no global session, event bus, or user state.
      const handler = createMcpHandler(() => createPatternServer(library, widget), {
        legacy: 'stateless',
        maxRequestBodySize: 16 * 1024,
        maxSubscriptions: 0,
        keepAliveMs: 0,
      });
      const response = await handler.fetch(request);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', 'no-store');
      headers.set('X-Content-Type-Options', 'nosniff');
      if (origin) {
        headers.set('Access-Control-Allow-Origin', origin);
        headers.set('Vary', 'Origin');
        headers.set(
          'Access-Control-Expose-Headers',
          'MCP-Protocol-Version, MCP-Session-Id, Retry-After',
        );
      }
      // Let the SDK finish/close the exchange and any SSE body it owns; don't truncate it.
      return new Response(response.body, { status: response.status, headers });
    } catch {
      return respond('MCP temporarily unavailable', 503);
    }
  };
}

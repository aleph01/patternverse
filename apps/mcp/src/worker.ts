import snapshot from '../dist/public-snapshot.json' with { type: 'json' };
import { createHttpEndpoint } from './http.js';
import { libraryFromSnapshot, type PublicSnapshot } from './snapshot.js';
import widget from '../dist/widget-resource.json' with { type: 'json' };

const endpoint = createHttpEndpoint(libraryFromSnapshot(snapshot as PublicSnapshot), widget);
export default {
  async fetch(
    request: Request,
    env: Pick<Env, 'MCP_RATE_LIMIT'> & { WIDGET_ASSETS: Pick<Env['WIDGET_ASSETS'], 'fetch'> },
  ): Promise<Response> {
    const url = new URL(request.url);
    // Only public, content-hashed JS/CSS/WASM. No HTML route, private files or SPA fallback.
    if (
      url.hostname === 'patternverse.org' ||
      url.hostname === 'localhost' ||
      url.hostname === '127.0.0.1'
    ) {
      if (/^\/mcp\/ui\/assets\/[\w-]+\.(js|css|wasm)$/.test(url.pathname)) {
        if (!['GET', 'HEAD'].includes(request.method))
          return new Response('Method not allowed', { status: 405 });
        const asset = await env.WIDGET_ASSETS.fetch(request);
        const headers = new Headers(asset.headers);
        headers.set('Access-Control-Allow-Origin', '*'); // Public immutable assets; never credentials.
        headers.set('X-Content-Type-Options', 'nosniff');
        if (asset.status === 200)
          headers.set('Cache-Control', 'public, max-age=31536000, immutable');
        return new Response(asset.body, { status: asset.status, headers });
      }
    }
    return endpoint(request, env);
  },
};

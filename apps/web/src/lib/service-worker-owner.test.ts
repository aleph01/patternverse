import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('$service-worker');
  vi.doUnmock('./navigation-manifest');
  vi.resetModules();
});

describe('owner statistics never use offline caches', () => {
  it.each(['/owner/stats', '/owner/stats/data?days=7', '/owner/stats/', '/api/usage'])(
    'rechecks the network for %s even if a previous cache contains it',
    async (path) => {
      vi.resetModules();
      const listeners = new Map<
        string,
        (event: { request: Request; respondWith(response: Promise<Response>): void }) => void
      >();
      const open = vi.fn(async () => ({
        match: async () => new Response('Old private statistics'),
      }));
      vi.stubGlobal('caches', { open });
      vi.stubGlobal('self', {
        location: { origin: 'https://patternverse.org' },
        addEventListener: (
          name: string,
          listener: typeof listeners extends Map<string, infer T> ? T : never,
        ) => listeners.set(name, listener),
      });
      vi.doMock('$service-worker', () => ({
        base: '',
        build: [],
        files: [],
        prerendered: ['/owner/stats'],
        version: 'test',
      }));
      vi.doMock('./navigation-manifest', () => ({
        navigationManifest: { pages: { '/owner/stats': 'legacy' }, redirects: {} },
      }));
      const network = vi.fn(async () => new Response('Sign in required', { status: 403 }));
      vi.stubGlobal('fetch', network);
      await import('../service-worker');
      const request = new Request(`https://patternverse.org${path}`);
      let pending: Promise<Response> | undefined;
      listeners.get('fetch')!({
        request,
        respondWith: (response) => {
          pending = response;
        },
      });
      expect((await pending)!.status).toBe(403);
      expect(network).toHaveBeenCalledWith(request, { cache: 'no-store' });
      expect(open).not.toHaveBeenCalled();
    },
  );
});

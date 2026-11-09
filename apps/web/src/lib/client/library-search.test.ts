import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLibrarySearchLoader } from './library-search';

vi.mock('$app/paths', () => ({ base: '/app' }));
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());
const body = JSON.stringify([{ id: 'commons:example', body: 'A public article.' }]);
const sha256 = createHash('sha256').update(body).digest('hex');
const asset = { path: `/library/search/${sha256}.json`, sha256 };

describe('deferred public search loading', () => {
  it('deduplicates in-flight requests and reuses the verified result without sending queries or credentials', async () => {
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const fetcher = vi.fn<typeof fetch>(async () => {
      await gate;
      return new Response(body);
    });
    const load = createLibrarySearchLoader(fetcher);
    const first = load(asset);
    expect(load(asset)).toBe(first);
    release();
    expect(await first).toEqual(JSON.parse(body));
    expect(await load(asset)).toBe(await first);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(fetcher.mock.calls[0]).toEqual([
      `/app${asset.path}`,
      { credentials: 'omit', signal: expect.any(AbortSignal) },
    ]);
  });

  it.each(['network', 'http', 'interrupted', 'wrong snapshot', 'redirect'])(
    'retains no failed %s request and allows an explicit retry',
    async (failure) => {
      const fetcher = vi.fn<typeof fetch>(async () => {
        if (failure === 'network') throw new TypeError('Offline');
        if (failure === 'http') return new Response('Unavailable', { status: 503 });
        if (failure === 'interrupted')
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.error(new Error('Interrupted'));
              },
            }),
          );
        if (failure === 'wrong snapshot') return new Response('another release');
        const response = new Response(body);
        Object.defineProperty(response, 'redirected', { value: true });
        return response;
      });
      const load = createLibrarySearchLoader(fetcher);
      await expect(load(asset)).rejects.toThrow();
      await Promise.resolve();
      expect(fetcher).toHaveBeenCalledOnce();
      fetcher.mockImplementation(async () => new Response(body));
      expect(await load(asset)).toEqual(JSON.parse(body));
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );

  it('never reuses bytes from a different corpus or accepts arbitrary endpoints', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(body));
    const load = createLibrarySearchLoader(fetcher);
    await load(asset);
    const next = { path: `/library/search/${'b'.repeat(64)}.json`, sha256: 'b'.repeat(64) };
    await expect(load(next)).rejects.toThrow('another snapshot');
    await expect(load({ ...asset, path: '/auth/callback' })).rejects.toThrow('Invalid');
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('remembers a verified early download once the first service worker controls the page', async () => {
    let claimed!: () => void;
    const postMessage = vi.fn();
    const workers = {
      controller: null as { postMessage: typeof postMessage } | null,
      ready: Promise.resolve(),
      addEventListener: vi.fn((_event: string, listener: () => void) => {
        claimed = listener;
      }),
    };
    vi.stubGlobal('navigator', { serviceWorker: workers });
    const fetcher = vi.fn<typeof fetch>(async () => new Response(body));
    const load = createLibrarySearchLoader(fetcher);
    await load(asset);
    await vi.waitFor(() => expect(workers.addEventListener).toHaveBeenCalledOnce());
    workers.controller = { postMessage };
    claimed();
    expect(postMessage).toHaveBeenCalledExactlyOnceWith({
      type: 'CACHE_VISIT',
      paths: [`/app${asset.path}`],
    });
    await load(asset);
    expect(fetcher).toHaveBeenCalledOnce();
    expect(postMessage).toHaveBeenCalledOnce();
  });
});

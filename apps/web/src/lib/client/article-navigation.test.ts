import { createHash, webcrypto } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createArticleNavigationLoader } from './article-navigation';

vi.mock('$app/paths', () => ({ base: '/app' }));
const body = JSON.stringify({ verses: [], collections: [] });
const sha256 = createHash('sha256').update(body).digest('hex');
const asset = { path: `/library/navigation/${sha256}.json`, sha256 };
beforeEach(() => vi.stubGlobal('crypto', webcrypto));
afterEach(() => vi.unstubAllGlobals());

describe('shared breadcrumb catalog', () => {
  it('shares one verified download without sending workspace credentials', async () => {
    const fetcher = vi.fn<typeof fetch>(async () => new Response(body));
    const load = createArticleNavigationLoader(fetcher);
    const first = load(asset);
    expect(load(asset)).toBe(first);
    expect(await first).toEqual({ verses: [], collections: [] });
    expect(await load(asset)).toBe(await first);
    expect(fetcher).toHaveBeenCalledExactlyOnceWith(`/app${asset.path}`, {
      credentials: 'omit',
      signal: expect.any(AbortSignal),
    });
  });
  it.each(['network', 'wrong release', 'http', 'redirect'])(
    'allows an explicit retry after %s failure',
    async (failure) => {
      const fetcher = vi.fn<typeof fetch>(async () => {
        if (failure === 'network') throw new TypeError('Offline');
        if (failure === 'wrong release') return new Response('another release');
        if (failure === 'http') return new Response('', { status: 503 });
        const response = new Response(body);
        Object.defineProperty(response, 'redirected', { value: true });
        return response;
      });
      const load = createArticleNavigationLoader(fetcher);
      await expect(load(asset)).rejects.toThrow();
      fetcher.mockImplementation(async () => new Response(body));
      expect(await load(asset)).toEqual({ verses: [], collections: [] });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it('rejects arbitrary endpoints without making a request', async () => {
    const fetcher = vi.fn<typeof fetch>();
    await expect(
      createArticleNavigationLoader(fetcher)({ ...asset, path: '/auth/callback' }),
    ).rejects.toThrow('Invalid');
    expect(fetcher).not.toHaveBeenCalled();
  });
});

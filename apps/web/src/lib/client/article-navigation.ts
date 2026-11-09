import { base } from '$app/paths';
import {
  isArticleNavigationPath,
  type ArticleNavigation,
  type NavigationAsset,
} from '$lib/article-navigation';
import { searchAssetDigest } from '$lib/library-search-asset';

export function createArticleNavigationLoader(fetcher: typeof fetch = (...args) => fetch(...args)) {
  const requests = new Map<string, Promise<ArticleNavigation>>();
  return (asset: NavigationAsset): Promise<ArticleNavigation> => {
    if (!isArticleNavigationPath(asset.path) || !asset.path.endsWith(`/${asset.sha256}.json`))
      return Promise.reject(new Error('Invalid navigation snapshot.'));
    const url = `${base}${asset.path}`;
    let pending = requests.get(url);
    if (!pending) {
      pending = (async () => {
        const response = await fetcher(url, {
          credentials: 'omit',
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok || response.redirected) throw new Error('Navigation unavailable.');
        const bytes = await response.arrayBuffer();
        if ((await searchAssetDigest(bytes)) !== asset.sha256)
          throw new Error('Navigation snapshot changed.');
        const result = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(result.verses) || !Array.isArray(result.collections))
          throw new Error('Invalid navigation data.');
        if (typeof navigator !== 'undefined')
          navigator.serviceWorker?.controller?.postMessage({ type: 'CACHE_VISIT', paths: [url] });
        return result as ArticleNavigation;
      })().catch((error: unknown) => {
        requests.delete(url);
        throw error;
      });
      requests.set(url, pending);
    }
    return pending;
  };
}
export const loadArticleNavigation = createArticleNavigationLoader();

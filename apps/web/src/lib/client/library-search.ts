import { base } from '$app/paths';
import type { LibrarySearchDocument } from '@patternverse/workspace/library';
import {
  isLibrarySearchPath,
  searchAssetDigest,
  type LibrarySearchAsset,
} from '$lib/library-search-asset';

function rememberSearch(url: string): void {
  const workers = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker;
  if (!workers) return;
  const remember = () => workers.controller?.postMessage({ type: 'CACHE_VISIT', paths: [url] });
  if (workers.controller) remember();
  else
    void workers.ready
      .then(() => {
        if (workers.controller) remember();
        else workers.addEventListener('controllerchange', remember, { once: true });
      })
      .catch(() => {});
}

/** One shared request per immutable corpus. Failures retry only after a deliberate user action. */
export function createLibrarySearchLoader(fetcher: typeof fetch = (...args) => fetch(...args)) {
  const requests = new Map<string, Promise<readonly LibrarySearchDocument[]>>();
  return (asset: LibrarySearchAsset): Promise<readonly LibrarySearchDocument[]> => {
    if (!isLibrarySearchPath(asset.path) || !asset.path.endsWith(`/${asset.sha256}.json`))
      return Promise.reject(new Error('Invalid search snapshot.'));
    const url = `${base}${asset.path}`;
    let request = requests.get(url);
    if (!request) {
      request = (async () => {
        const response = await fetcher(url, {
          credentials: 'omit',
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok || response.redirected) throw new Error('Search download unavailable.');
        const bytes = await response.arrayBuffer();
        if ((await searchAssetDigest(bytes)) !== asset.sha256)
          throw new Error('Search belongs to another snapshot.');
        const documents = JSON.parse(new TextDecoder().decode(bytes));
        if (!Array.isArray(documents)) throw new Error('Invalid search documents.');
        // A very early search may finish before the first worker controls the page.
        // Reuse its bounded visit warmer rather than relying only on fetch interception.
        rememberSearch(url);
        return documents as readonly LibrarySearchDocument[];
      })().catch((error: unknown) => {
        requests.delete(url);
        throw error;
      });
      requests.set(url, request);
    }
    return request;
  };
}

export const loadLibrarySearch = createLibrarySearchLoader();

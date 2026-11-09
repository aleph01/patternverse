import { loadCommons } from '$lib/server/commons';
import { libraryBrowsingData, librarySearchAsset } from '$lib/server/library-search';

export const load = async () => {
  const corpus = await loadCommons();
  return {
    ...libraryBrowsingData(corpus),
    searchAsset: librarySearchAsset(corpus).asset,
  };
};

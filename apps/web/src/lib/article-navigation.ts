import { libraryEntryKey } from '@patternverse/workspace/library';
import type { EntitySummary } from '$lib/server/commons';

export type NavigationEntry = Pick<EntitySummary, 'id' | 'sourceId' | 'type' | 'title' | 'url'>;
export type NavigationCollection = NavigationEntry & {
  verseKeys: readonly string[];
  items: readonly NavigationEntry[];
};
export type NavigationVerse = NavigationEntry & { collectionKeys: readonly string[] };
export type ArticleNavigation = {
  verses: readonly NavigationVerse[];
  collections: readonly NavigationCollection[];
};
export type NavigationAsset = Readonly<{ path: string; sha256: string }>;
export type ArticleNavigationContext = {
  asset: NavigationAsset;
  entity: NavigationEntry;
  verseKeys: readonly string[];
  navigation: ArticleNavigation;
};
export const navigationKey = libraryEntryKey;
export const isArticleNavigationPath = (path: string) =>
  /^\/library\/navigation\/[a-f0-9]{64}\.json$/.test(path);

/** A URL's Verse is context only when it actually contains the current collection/article. */
export function navigationVerse(
  verses: readonly NavigationVerse[],
  collection: NavigationCollection | undefined,
  articleVerseKeys: readonly string[],
  requested: string | null,
): NavigationVerse | undefined {
  const keys = collection?.verseKeys.length ? collection.verseKeys : articleVerseKeys;
  const available = keys.flatMap((key) => {
    const verse = verses.find((candidate) => navigationKey(candidate) === key);
    return verse ? [verse] : [];
  });
  return available.find((verse) => navigationKey(verse) === requested) ?? available[0];
}

import type { EntityRef } from '@patternverse/schema';
import { libraryEntryKey } from '@patternverse/workspace/library';
import type { EntitySummary } from '$lib/server/commons';

export type CollectionOverview = {
  readonly collection: EntitySummary;
  readonly items: readonly EntitySummary[];
};

export const collectionKey = libraryEntryKey;

/** Keep browsing context in the link, not in a global or persisted preference. */
export function collectionItemHref(
  url: string,
  collection: Pick<EntitySummary, 'sourceId' | 'id'>,
): string {
  const target = new URL(url, 'https://patternverse.invalid');
  target.searchParams.set('collection', collectionKey(collection));
  return `${target.pathname}${target.search}${target.hash}`;
}

/** Ignore stale/unrelated URL context and never confuse identical IDs across sources. */
export function collectionForArticle(
  overviews: readonly CollectionOverview[],
  article: EntityRef,
  requested: string | null,
): CollectionOverview | undefined {
  const memberships = overviews.filter(({ items }) =>
    items.some((item) => item.sourceId === article.sourceId && item.id === article.entityId),
  );
  return (
    memberships.find(({ collection }) => collectionKey(collection) === requested) ?? memberships[0]
  );
}

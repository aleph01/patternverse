import { resolve } from '$app/paths';
import type { RawEntity } from '@patternverse/schema';
import {
  summarizePersonalEntity,
  legacyRelationshipIndex,
  libraryRefKey,
} from '@patternverse/workspace/library';
import type { EntitySummary } from '$lib/server/commons';
import { collectionKey } from '$lib/collection-navigation';

export type LibraryCollections = ReadonlyMap<string, readonly EntitySummary[]>;

/** Resolve against the full catalog, independently of library/search filters. */
export function libraryCollections(
  commons: readonly EntitySummary[],
  personal: readonly RawEntity[],
): LibraryCollections {
  const local = new Map(
    personal.map((entity) => [
      entity.id,
      {
        ...summarizePersonalEntity(entity),
        url: `${resolve('/editor')}?id=${encodeURIComponent(entity.id)}`,
      },
    ]),
  );
  const personalRelationships = legacyRelationshipIndex([...local.values()], commons);
  const index = new Map(
    [...commons, ...local.values()].map((entry) => [collectionKey(entry), entry]),
  );
  const uniqueItems = (items: readonly EntitySummary[]) => [
    ...new Map(items.map((entry) => [collectionKey(entry), entry])).values(),
  ];
  return new Map([
    ...commons
      .filter((entry) => entry.type === 'collection')
      .map(
        (entry) =>
          [
            collectionKey(entry),
            uniqueItems(
              (entry.collectionItems ?? []).flatMap((ref) => {
                const item = index.get(libraryRefKey(ref));
                return item && item.type !== 'verse' ? [item] : [];
              }),
            ),
          ] as const,
      ),
    ...personal
      .filter((entry) => entry.type === 'collection')
      .map(
        (entry) =>
          [
            collectionKey(entry),
            uniqueItems(
              entry.items.flatMap((id) => {
                // Private references resolve locally first; public references stay source-qualified.
                const item = personalRelationships.get(id);
                return item && item.type !== 'verse' ? [item] : [];
              }),
            ),
          ] as const,
      ),
  ]);
}

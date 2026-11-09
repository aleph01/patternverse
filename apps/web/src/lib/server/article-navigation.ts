import { createHash } from 'node:crypto';
import { entityRefKey, type CompiledCorpus, type CompiledEntity } from '@patternverse/compiler';
import type { ArticleNavigation, NavigationEntry, NavigationAsset } from '$lib/article-navigation';

const caches = new WeakMap<
  CompiledCorpus,
  { navigation: ArticleNavigation; body: string; asset: NavigationAsset }
>();
const entry = (entity: CompiledEntity): NavigationEntry => ({
  id: entity.id,
  sourceId: entity.sourceId,
  type: entity.type,
  title: entity.title,
  url: `/${entity.type}/${entity.id}`,
});

/** Shared labels and authored ordering only; article bodies never enter the navigation asset. */
export function articleNavigationAsset(corpus: CompiledCorpus) {
  const cached = caches.get(corpus);
  if (cached) return cached;
  const index = new Map(corpus.entities.map((entity) => [entityRefKey(entity.ref), entity]));
  const collections = corpus.entities
    .filter((entity) => entity.type === 'collection')
    .map((entity) => ({
      ...entry(entity),
      verseKeys: entity.verseMemberships.map(entityRefKey),
      items: entity.collectionItems.flatMap((ref) => {
        const item = index.get(entityRefKey(ref));
        return item ? [entry(item)] : [];
      }),
    }));
  const navigation: ArticleNavigation = {
    collections,
    verses: corpus.entities
      .filter((entity) => entity.type === 'verse')
      .map((entity) => ({
        ...entry(entity),
        collectionKeys: collections
          .filter((collection) => collection.verseKeys.includes(entityRefKey(entity.ref)))
          .map((collection) => `${collection.sourceId}:${collection.id}`),
      })),
  };
  const body = JSON.stringify(navigation);
  const sha256 = createHash('sha256').update(body).digest('hex');
  const result = {
    navigation,
    body,
    asset: { path: `/library/navigation/${sha256}.json`, sha256 },
  };
  caches.set(corpus, result);
  return result;
}

/** Embed the current path and collection only; other collections load on the first interaction. */
export function articleNavigationContext(corpus: CompiledCorpus, entity: CompiledEntity) {
  const { navigation, asset } = articleNavigationAsset(corpus);
  const key = entityRefKey(entity.ref);
  const byKey = new Map(
    navigation.collections.map((collection) => [
      `${collection.sourceId}:${collection.id}`,
      collection,
    ]),
  );
  const collections =
    entity.type === 'collection'
      ? byKey.has(key)
        ? [byKey.get(key)!]
        : []
      : entity.collectionMemberships.flatMap((ref) => {
          const collection = byKey.get(entityRefKey(ref));
          return collection?.items.some((item) => `${item.sourceId}:${item.id}` === key)
            ? [collection]
            : [];
        });
  // Match the existing guided-course default when no explicit URL context was supplied.
  if (entity.sourceId === 'commons' && entity.id.startsWith('songwriting-'))
    collections.sort(
      (a, b) =>
        Number(b.id.startsWith('songwriting-part-')) - Number(a.id.startsWith('songwriting-part-')),
    );
  const verseKeys = entity.verseMemberships.map(entityRefKey);
  const related = new Set([
    ...verseKeys,
    ...collections.flatMap((collection) => collection.verseKeys),
  ]);
  return {
    asset,
    entity: entry(entity),
    verseKeys,
    navigation: {
      collections,
      verses: navigation.verses.filter((verse) => related.has(`${verse.sourceId}:${verse.id}`)),
    },
  };
}

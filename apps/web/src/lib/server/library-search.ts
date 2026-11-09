import { createHash } from 'node:crypto';
import type { CompiledCorpus } from '@patternverse/compiler';
import { entityRefKey } from '@patternverse/schema';
import type { LibrarySearchDocument } from '@patternverse/workspace/library';
import type { LibrarySearchAsset } from '$lib/library-search-asset';
import { summarizeEntity } from './commons';

const assets = new WeakMap<CompiledCorpus, { body: string; asset: LibrarySearchAsset }>();

export function librarySearchAsset(corpus: CompiledCorpus) {
  const existing = assets.get(corpus);
  if (existing) return existing;
  const documents: readonly LibrarySearchDocument[] = corpus.searchDocuments
    .filter((document) => document.type === 'pattern' || document.type === 'collection')
    .map(({ ref, ...document }) => ({ ...document, entityId: ref.entityId }));
  const body = JSON.stringify(documents);
  const sha256 = createHash('sha256').update(body).digest('hex');
  const result = { body, asset: { path: `/library/search/${sha256}.json`, sha256 } };
  assets.set(corpus, result);
  return result;
}

/** Browsing labels are small metadata; they must not depend on downloading article bodies. */
export function libraryBrowsingData(corpus: CompiledCorpus) {
  const labels = new Map(corpus.searchDocuments.map((document) => [document.id, document]));
  return {
    entities: corpus.entities.map((entity) => {
      const document = labels.get(entityRefKey(entity.ref));
      return {
        ...summarizeEntity(entity),
        collectionNames: document?.collectionNames ?? [],
        verseNames: document?.verseNames ?? [],
      };
    }),
    verses: corpus.entities
      .filter((entity) => entity.type === 'verse')
      .map((entity) => ({
        id: entity.id,
        sourceId: entity.sourceId,
        title: entity.title,
        summary: entity.summary ?? '',
        itemKeys: entity.verseMembers.map(entityRefKey),
      })),
  };
}

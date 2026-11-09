// @vitest-environment jsdom
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import type { CompiledCorpus } from '@patternverse/compiler';
import { createBrowsableLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { loadCommons, summarizeEntity } from './commons';
import { libraryBrowsingData, librarySearchAsset } from './library-search';
import { GET, entries } from '../../routes/library/search/[hash].json/+server';

let corpus: CompiledCorpus;
vi.mock('$app/environment', () => ({ dev: false }));
beforeAll(async () => {
  vi.stubEnv('PATTERNVERSE_INCLUDE_DRAFTS', 'false');
  corpus = await loadCommons();
});
afterAll(() => vi.unstubAllEnvs());

describe('public library browsing and deferred search', () => {
  it('keeps body growth out of browsing data while changing the immutable search identity', () => {
    const larger: CompiledCorpus = {
      ...corpus,
      entities: corpus.entities.map((entity) => ({
        ...entity,
        body: `${entity.body}\n${'Extra article body. '.repeat(1000)}`,
      })),
      searchDocuments: corpus.searchDocuments.map((document) => ({
        ...document,
        body: `${document.body}\n${'Only in deferred article bodies. '.repeat(1000)}`,
      })),
    };
    expect(libraryBrowsingData(larger)).toEqual(libraryBrowsingData(corpus));
    expect(librarySearchAsset(larger).asset.path).not.toBe(librarySearchAsset(corpus).asset.path);
    expect(JSON.stringify(libraryBrowsingData(corpus))).not.toContain('Only in deferred');
  });

  it('preserves source-qualified labels before loading full text', () => {
    const data = libraryBrowsingData(corpus);
    for (const entry of data.entities) {
      const document = corpus.searchDocuments.find(
        (document) => document.id === `${entry.sourceId}:${entry.id}`,
      );
      expect(entry.collectionNames).toEqual(document?.collectionNames ?? []);
      expect(entry.verseNames).toEqual(document?.verseNames ?? []);
      expect(entry).not.toHaveProperty('body');
    }
  });

  it('uses identical public search fields and ranking without shipping non-browsable documents', () => {
    const { body, asset } = librarySearchAsset(corpus);
    expect(asset.sha256).toBe(createHash('sha256').update(body).digest('hex'));
    expect(librarySearchAsset(corpus)).toBe(librarySearchAsset(corpus));
    const deferred = JSON.parse(body);
    expect(
      deferred.every(
        (document: { type: string; status: string; sourceId: string }) =>
          ['pattern', 'collection'].includes(document.type) &&
          document.status !== 'draft' &&
          document.sourceId !== 'personal',
      ),
    ).toBe(true);
    const search = (documents: typeof deferred) =>
      createLibrarySearch(
        createBrowsableLibrary([
          {
            id: 'commons',
            name: 'Commons',
            readonly: true,
            entries: corpus.entities.map(summarizeEntity),
            searchDocuments: documents,
          },
        ]),
      );
    const before = search(
      corpus.searchDocuments.map(({ ref, ...document }) => ({
        ...document,
        entityId: ref.entityId,
      })),
    );
    const after = search(deferred);
    for (const query of [
      'creative reframing',
      'Sleight of Mouth',
      'learning',
      'comparison',
      'Miller',
    ]) {
      expect(after.search(query)).toEqual(before.search(query));
    }
  });

  it('prerenders the exact immutable endpoint and rejects another snapshot', async () => {
    const { asset, body } = librarySearchAsset(corpus);
    expect(await entries()).toEqual([{ hash: asset.sha256 }]);
    const response = await GET({ params: { hash: asset.sha256 } } as Parameters<typeof GET>[0]);
    expect(response.headers.get('cache-control')).toContain('immutable');
    expect(await response.text()).toBe(body);
    await expect(
      GET({ params: { hash: 'another-release' } } as Parameters<typeof GET>[0]),
    ).rejects.toMatchObject({ status: 404 });
  });
});

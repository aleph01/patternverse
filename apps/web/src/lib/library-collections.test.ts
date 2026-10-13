// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { RawEntity } from '@patternverse/schema';
import type { EntitySummary } from '$lib/server/commons';
import { libraryCollections } from './library-collections';

const entry = (id: string, type: EntitySummary['type'] = 'pattern'): EntitySummary => ({
  id,
  type,
  sourceId: 'commons',
  title: id,
  summary: '',
  status: 'published',
  url: `/${type}/${id}`,
});
const privatePattern: RawEntity = {
  id: 'shared',
  sourceId: 'personal',
  type: 'pattern',
  title: 'My shared pattern',
  status: 'draft',
  body: '',
  sourcePath: 'shared.md',
};

describe('Library collection contents', () => {
  it('preserves public identities and private-first resolution across colliding IDs and authored orders', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 99 }), { minLength: 1, maxLength: 25 }),
        (numbers) => {
          const ids = numbers.map((number) => `pattern-${number}`);
          const publicItems = ids.map((id) => entry(id));
          const privateItems: RawEntity[] = ids.map((id) => ({ ...privatePattern, id }));
          const publicCollection: EntitySummary = {
            ...entry('public-set', 'collection'),
            collectionItems: ids.map((entityId) => ({ sourceId: 'commons', entityId })),
          };
          const privateCollection: RawEntity = {
            ...privatePattern,
            id: 'private-set',
            type: 'collection',
            items: ids,
          };
          const contents = libraryCollections(
            [...publicItems, publicCollection],
            [...privateItems, privateCollection],
          );
          expect(
            contents.get('commons:public-set')?.map((item) => [item.sourceId, item.id]),
          ).toEqual(ids.map((id) => ['commons', id]));
          expect(
            contents.get('personal:private-set')?.map((item) => [item.sourceId, item.id]),
          ).toEqual(ids.map((id) => ['personal', id]));
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });
  it('preserves authored order and public source identity despite private ID collisions', () => {
    const publicCollection: EntitySummary = {
      ...entry('public-collection', 'collection'),
      collectionItems: ['second', 'shared', 'missing', 'second'].map((entityId) => ({
        sourceId: 'commons',
        entityId,
      })),
    };
    const contents = libraryCollections(
      [entry('shared'), entry('second'), publicCollection],
      [privatePattern],
    );
    expect(
      contents.get('commons:public-collection')?.map((item) => [item.sourceId, item.id]),
    ).toEqual([
      ['commons', 'second'],
      ['commons', 'shared'],
    ]);
  });

  it('resolves private references locally first, falls back to Commons, and skips missing/verse items', () => {
    const privateCollection: RawEntity = {
      id: 'private-collection',
      sourceId: 'personal',
      type: 'collection',
      title: 'My collection',
      status: 'draft',
      body: '',
      sourcePath: 'collection.md',
      items: ['shared', 'second', 'missing', 'verse'],
    };
    const contents = libraryCollections(
      [entry('shared'), entry('second'), entry('verse', 'verse')],
      [privatePattern, privateCollection],
    );
    expect(
      contents
        .get('personal:private-collection')
        ?.map((item) => [item.sourceId, item.title, item.url]),
    ).toEqual([
      ['personal', 'My shared pattern', '/editor?id=shared'],
      ['commons', 'second', '/pattern/second'],
    ]);
  });
});

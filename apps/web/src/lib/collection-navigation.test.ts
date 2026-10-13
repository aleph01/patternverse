import { describe, expect, it } from 'vitest';
import {
  collectionForArticle,
  collectionItemHref,
  type CollectionOverview,
} from './collection-navigation';

const item = (sourceId: string, id: string) => ({
  sourceId,
  id,
  title: id,
  type: 'pattern' as const,
  status: 'published' as const,
  summary: '',
  url: `/pattern/${id}`,
});
const overview = (id: string, ids: readonly string[]): CollectionOverview => ({
  collection: { ...item('commons', id), type: 'collection', url: `/collection/${id}` },
  items: ids.map((id) => item('commons', id)),
});

describe('collection browsing context', () => {
  it('keeps authored order and the requested collection for an article in several collections', () => {
    const all = overview('all-patterns', ['first', 'current', 'last']);
    const subset = overview('subset', ['last', 'current']);
    expect(
      collectionForArticle(
        [all, subset],
        { sourceId: 'commons', entityId: 'current' },
        'commons:subset',
      ),
    ).toBe(subset);
    expect(all.items.map((entry) => entry.id)).toEqual(['first', 'current', 'last']);
  });
  it('ignores invalid context and requires source-qualified article membership', () => {
    const collection = overview('example', ['current']);
    expect(
      collectionForArticle(
        [collection],
        { sourceId: 'commons', entityId: 'current' },
        'commons:missing',
      ),
    ).toBe(collection);
    expect(
      collectionForArticle(
        [collection],
        { sourceId: 'personal', entityId: 'current' },
        'commons:example',
      ),
    ).toBeUndefined();
  });
  it('replaces only collection context while preserving other query parameters and fragments', () => {
    expect(
      collectionItemHref('/pattern/current?mode=reading&collection=old#examples', {
        sourceId: 'commons',
        id: 'example',
      }),
    ).toBe('/pattern/current?mode=reading&collection=commons%3Aexample#examples');
    expect(collectionItemHref('/pattern/current', { sourceId: 'personal', id: 'example' })).toBe(
      '/pattern/current?collection=personal%3Aexample',
    );
  });
});

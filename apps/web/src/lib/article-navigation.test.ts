import { describe, expect, it } from 'vitest';
import {
  navigationVerse,
  type NavigationCollection,
  type NavigationVerse,
} from './article-navigation';

const verse = (sourceId: string, id: string): NavigationVerse => ({
  sourceId,
  id,
  type: 'verse',
  title: id,
  url: `/verse/${id}`,
  collectionKeys: [],
});
const verses = [
  verse('commons', 'software'),
  verse('commons', 'learning'),
  verse('personal', 'software'),
];
const collection: NavigationCollection = {
  sourceId: 'commons',
  id: 'examples',
  type: 'collection',
  title: 'Examples',
  url: '/collection/examples',
  verseKeys: ['commons:learning', 'commons:software'],
  items: [],
};

describe('breadcrumb Verse context', () => {
  it('keeps an explicit valid path for a collection belonging to several Verses', () => {
    expect(navigationVerse(verses, collection, [], 'commons:software')).toBe(verses[0]);
    expect(navigationVerse(verses, collection, [], null)).toBe(verses[1]);
  });
  it('ignores stale or source-colliding context and falls back to authored order', () => {
    expect(navigationVerse(verses, collection, [], 'personal:software')).toBe(verses[1]);
    expect(navigationVerse(verses, collection, [], 'unknown')).toBe(verses[1]);
  });
  it('uses the article memberships outside a collection and tolerates unassigned entries', () => {
    expect(navigationVerse(verses, undefined, ['personal:software'], null)).toBe(verses[2]);
    expect(navigationVerse(verses, undefined, [], null)).toBeUndefined();
  });
});

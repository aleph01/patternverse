import { describe, expect, it } from 'vitest';
import { filterLibrary, libraryPatternCell, patternSuggestions } from './library';
import type { BearingsPattern } from './catalog';

const pattern = (
  id: string,
  title: string,
  summary = '',
  sourceId = 'commons',
): BearingsPattern => ({
  sourceId,
  id,
  title,
  summary,
  verses: [],
  collections: [],
  practices: [],
});
describe('multi-select library scopes', () => {
  it('matches any choice within each group, intersects groups, and returns overlapping patterns once', () => {
    const group = (key: string) => ({ key, title: key, sourceId: key.split(':')[0]! });
    const patterns = [
      {
        ...pattern('one', 'First thought'),
        verses: [group('commons:a'), group('commons:b')],
        collections: [group('commons:x'), group('commons:y')],
      },
      {
        ...pattern('two', 'Second thought'),
        verses: [group('commons:b')],
        collections: [group('commons:y')],
        practices: [{ sourceId: 'commons', id: 'try', title: 'Try', source: '{}' }],
      },
      {
        ...pattern('three', 'Third thought'),
        verses: [group('personal:a')],
        collections: [group('commons:x')],
      },
      {
        ...pattern('four', 'Other'),
        verses: [group('commons:a')],
        collections: [group('commons:z')],
      },
    ];
    const ids = (verses: string[], collections: string[], query = '', practice = false) =>
      filterLibrary(patterns, verses, collections, query, practice).map((p) => p.id);
    expect(ids(['commons:a', 'commons:b'], ['commons:x', 'commons:y'])).toEqual(['one', 'two']);
    expect(ids(['commons:a', 'commons:b'], ['commons:y'], 'second', true)).toEqual(['two']);
    expect(ids(['personal:a'], [])).toEqual(['three']);
    expect(ids([], ['commons:x'])).toEqual(['one', 'three']);
    expect(ids([], [])).toEqual(['one', 'two', 'three', 'four']);
  });
});
describe('quick pattern selection', () => {
  it('matches separate words, accents and collection names, ranking titles first', () => {
    const collection = {
      key: 'commons:choices',
      title: 'Décision frameworks',
      sourceId: 'commons',
    };
    const patterns = [
      pattern('summary', 'Another approach', 'Clarify the decision before making a comparison'),
      {
        ...pattern('title', 'Define the Decision', 'Clarify before comparing'),
        collections: [collection],
      },
      pattern('unrelated', 'Other'),
    ];
    expect(patternSuggestions(patterns, 'decision').map((p) => p.id)).toEqual(['title', 'summary']);
    expect(patternSuggestions(patterns, 'before decision').map((p) => p.id)).toEqual([
      'summary',
      'title',
    ]);
    expect(patternSuggestions(patterns, 'decision frameworks').map((p) => p.id)).toEqual(['title']);
    expect(patternSuggestions(patterns, 'nothing')).toEqual([]);
  });
  it('respects the sidebar scope and keeps personal identities distinct', () => {
    const published = pattern('same', 'A pattern');
    const personal = {
      ...pattern('same', 'My approach', '', 'personal'),
      practices: [{ sourceId: 'personal', id: 'try', title: 'Try it', source: '{}' }],
    };
    expect(
      patternSuggestions(filterLibrary([published, personal], '', '', '', true), '').map(
        (p) => p.sourceId,
      ),
    ).toEqual(['personal']);
    const first = libraryPatternCell(personal),
      second = libraryPatternCell(personal);
    expect(first.id).not.toBe(second.id);
    expect(first).toMatchObject({
      kind: 'pattern',
      text: '',
      pattern: { sourceId: 'personal', entityId: 'same', title: 'My approach' },
    });
    expect(first.practice).toBeUndefined();
  });
});

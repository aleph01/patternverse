import { describe, expect, it } from 'vitest';
import {
  createLibrarySearch,
  libraryEntryKey,
  type Library,
  type LibraryEntry,
  type LibrarySearchDocument,
} from '../src/library.js';

function document(
  id: string,
  title: string,
  overrides: Partial<LibrarySearchDocument> = {},
): LibrarySearchDocument {
  return {
    id: `commons:${id}`,
    entityId: id,
    sourceId: 'commons',
    type: 'pattern',
    status: 'published',
    title,
    summary: '',
    aliases: [],
    body: '',
    verseNames: [],
    collectionNames: [],
    ...overrides,
  };
}
function fixture(documents: LibrarySearchDocument[]) {
  const library: Library = {
    sources: [],
    entries: documents.map((doc) => ({ ...doc, id: doc.entityId })),
    searchDocuments: documents,
  };
  return createLibrarySearch(library);
}
const keys = (entries: readonly LibraryEntry[]) => entries.map(libraryEntryKey);

describe('conservative library search fallback', () => {
  it('keeps strict ranking and scores intact, and deduplicates by source-qualified ID', () => {
    const search = fixture([
      document('exact', 'Compare difficult options'),
      document('body', 'Choices', { body: 'Compare difficult options in practice' }),
      document('partial', 'Compare options'),
      document('partial', 'Compare options', { id: 'personal:partial', sourceId: 'personal' }),
      document('weak', 'Options'),
    ]);
    const groups = search.searchWithFallback('compare difficult options');
    expect(groups.strict).toEqual(search.search('compare difficult options'));
    expect(groups.strict[0]?.id).toBe('exact');
    expect(new Set(keys(groups.broader))).toEqual(new Set(['commons:partial', 'personal:partial']));
    expect(keys([...groups.strict, ...groups.broader])).toHaveLength(4);
  });

  it.each([0, 1, 2, 3, 4])('broadens only below three accepted strict results (%i)', (count) => {
    const search = fixture([
      ...Array.from({ length: count }, (_, i) =>
        document(`exact-${i}`, 'Compare difficult options'),
      ),
      document('partial', 'Compare options'),
    ]);
    const groups = search.searchWithFallback('compare difficult options');
    expect(groups.strict).toHaveLength(count);
    expect(keys(groups.broader)).toEqual(count < 3 ? ['commons:partial'] : []);
  });

  it('ranks term coverage before relevance and relevance within equal coverage', () => {
    const search = fixture([
      document('coverage', 'Field notes', { body: 'alpha beta gamma' }),
      document('title', 'Alpha beta'),
      document('body', 'Other notes', { body: 'alpha beta' }),
      document('weak', 'Alpha'),
    ]);
    expect(keys(search.searchWithFallback('alpha beta gamma delta').broader)).toEqual([
      'commons:coverage',
      'commons:title',
      'commons:body',
    ]);
    // Five distinct meaningful terms require at least three matches.
    expect(keys(search.searchWithFallback('alpha beta gamma delta epsilon').broader)).toEqual([
      'commons:coverage',
    ]);
  });

  it('does not count multiple prefix or fuzzy expansions as multiple query terms', () => {
    const search = fixture([
      document('expansions', 'Learning learned learner'),
      document('enough', 'Learn recall'),
    ]);
    expect(keys(search.searchWithFallback('learn recall memory').broader)).toEqual([
      'commons:enough',
    ]);
  });

  it('ignores conversational filler only in fallback, leaving original strict search intact', () => {
    const search = fixture([
      document('learning', 'Remember what you learn'),
      document('weak', 'Remember please'),
    ]);
    const query = 'how can I remember what I learn';
    const groups = search.searchWithFallback(query);
    expect(groups.strict).toEqual(search.search(query));
    expect(groups.strict).toEqual([]);
    expect(keys(groups.broader)).toEqual(['commons:learning']);
  });

  it.each(['learn', 'learn learn', 'how can I learn', 'how can I what the', '   ', '?!'])(
    'does not broaden single-meaningful-term, filler-only, or empty queries: %s',
    (query) => {
      const search = fixture([document('learning', 'Learn recall')]);
      const groups = search.searchWithFallback(query);
      expect(groups.strict).toEqual(search.search(query));
      expect(groups.broader).toEqual([]);
    },
  );

  it('uses the same source, type, and caller filters for both groups before checking the threshold', () => {
    const search = fixture([
      ...Array.from({ length: 3 }, (_, i) =>
        document(`excluded-${i}`, 'Compare difficult options'),
      ),
      document('kept', 'Compare difficult options'),
      document('partial', 'Compare options'),
      document('collection', 'Compare options', { type: 'collection' }),
      document('private', 'Compare options', { id: 'personal:private', sourceId: 'personal' }),
      document('rejected', 'Compare options'),
    ]);
    const groups = search.searchWithFallback(
      'compare difficult options',
      { sourceId: 'commons', type: 'pattern' },
      (entry) => entry.id === 'kept' || entry.id === 'partial',
    );
    expect(keys(groups.strict)).toEqual(['commons:kept']);
    expect(keys(groups.broader)).toEqual(['commons:partial']);
  });

  it('shares the lazy index between strict and fallback searches and skips it for browsing', () => {
    let reads = 0;
    const doc = document('partial', 'Compare options');
    const search = createLibrarySearch({
      sources: [],
      entries: [{ ...doc, id: doc.entityId }],
      get searchDocuments() {
        reads++;
        return [doc];
      },
    });
    search.searchWithFallback('');
    expect(reads).toBe(0);
    search.searchWithFallback('compare difficult options');
    search.searchWithFallback('how can I compare these options');
    search.search('compare');
    expect(reads).toBe(1);
  });
});

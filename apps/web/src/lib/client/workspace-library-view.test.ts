import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { RawEntity, SavedLibraryEntry, WorkspaceUsefulness } from '@patternverse/workspace';
import { libraryEntryKey, type LibrarySearchDocument } from '@patternverse/workspace/library';
import type { EntitySummary } from '$lib/server/commons';
import {
  createWorkspaceLibraryCatalog,
  initialLibraryCategory,
  workspaceLibraryView,
  type LibraryVerse,
} from './workspace-library-view';

const entry = (id: string, type: EntitySummary['type'] = 'pattern'): EntitySummary => ({
  id,
  type,
  sourceId: 'commons',
  title: id,
  summary: `About ${id}`,
  status: 'published',
  url: `/${type}/${id}`,
});
const document = (e: EntitySummary): LibrarySearchDocument => ({
  ...e,
  id: libraryEntryKey(e),
  entityId: e.id,
  aliases: [],
  body: e.summary,
  verseNames: [],
  collectionNames: [],
});
const personalPattern: RawEntity = {
  id: 'shared',
  sourceId: 'personal',
  type: 'pattern',
  status: 'draft',
  title: 'Private shared pattern',
  body: 'A private searchable nebula',
  verses: ['software'],
};
const saved = (id: string, sourceId = 'commons'): SavedLibraryEntry => ({
  workspaceId: 'mine',
  ref: { sourceId, entityId: id },
  createdAt: '2026-10-01',
});
const rating = (id: string, usefulness: 0 | 1 | 2, sourceId = 'commons'): WorkspaceUsefulness => ({
  workspaceId: 'mine',
  ref: { sourceId, entityId: id },
  usefulness,
  updatedAt: '2026-10-01',
});
const defaults: Parameters<typeof workspaceLibraryView>[1] = {
  savedEntries: [],
  ratings: [],
  scope: 'explore',
  selectedVerse: 'all',
  query: '',
  category: 'all',
  initialCategory: 'all',
  ratingFilter: 'any',
  showControls: true,
  featuredRank: new Map(),
};
function fixture(overrides: Partial<Parameters<typeof createWorkspaceLibraryCatalog>[0]> = {}) {
  const commons = [entry('shared'), entry('builder'), entry('methods', 'collection')];
  const commonsVerses: LibraryVerse[] = [
    {
      id: 'software',
      sourceId: 'commons',
      title: 'Software',
      itemKeys: ['commons:shared', 'commons:methods'],
    },
    { id: 'building', sourceId: 'commons', title: 'Building', itemKeys: ['commons:builder'] },
    { id: 'empty', sourceId: 'commons', title: 'Empty', itemKeys: [] },
  ];
  return createWorkspaceLibraryCatalog({
    commons,
    commonsSearchDocuments: commons.map(document),
    commonsVerses,
    personal: [],
    editorHref: '/base/editor',
    ...overrides,
  });
}
const keys = (entries: readonly EntitySummary[]) => entries.map(libraryEntryKey);

describe('workspace library catalog', () => {
  it('shares the existing browse/search policy without changing stored legacy records', () => {
    const commons = [entry('kept'), entry('old', 'concept'), entry('old-practice', 'practice')];
    const personal: RawEntity[] = [
      personalPattern,
      { ...personalPattern, id: 'legacy-concept', type: 'concept' },
      { ...personalPattern, id: 'legacy-practice', type: 'practice' },
      { ...personalPattern, id: 'software', type: 'verse' },
    ];
    const original = structuredClone({ commons, personal });
    const catalog = fixture({ commons, commonsSearchDocuments: commons.map(document), personal });
    expect(catalog.counts).toEqual({ total: 2, personal: 1, commons: 1 });
    expect(keys(workspaceLibraryView(catalog, defaults).results)).toEqual([
      'personal:shared',
      'commons:kept',
    ]);
    expect(catalog.search.search('nebula').map(libraryEntryKey)).toEqual(['personal:shared']);
    expect({ commons, personal }).toEqual(original);
  });
  it('keeps source-qualified verses distinct and resolves bare private verse references locally first', () => {
    const localVerse: RawEntity = {
      id: 'software',
      sourceId: 'personal',
      title: 'Private software',
      type: 'verse',
      status: 'draft',
      body: '',
    };
    const catalog = fixture({ personal: [localVerse, personalPattern] });
    expect(catalog.verses.map((v) => v.key)).toEqual([
      'personal:software',
      'commons:software',
      'commons:building',
      'commons:empty',
    ]);
    expect(catalog.verseMembers.get('personal:software')).toEqual(new Set(['personal:shared']));
    expect(catalog.verseMembers.get('commons:software')).toEqual(
      new Set(['commons:shared', 'commons:methods']),
    );
    expect(
      keys(
        workspaceLibraryView(catalog, { ...defaults, selectedVerse: 'personal:software' }).results,
      ),
    ).toEqual(['personal:shared']);
    expect(
      keys(
        workspaceLibraryView(catalog, { ...defaults, selectedVerse: 'commons:software' }).results,
      ),
    ).toEqual(['commons:shared', 'commons:methods']);
  });
  it('adds private members to a Commons verse when there is no matching private verse', () => {
    const catalog = fixture({ personal: [personalPattern] });
    expect(catalog.verseMembers.get('commons:software')).toEqual(
      new Set(['commons:shared', 'commons:methods', 'personal:shared']),
    );
  });
  it('does not let a private non-verse shadow a Commons verse and tolerates repeated memberships', () => {
    const catalog = fixture({
      personal: [{ ...personalPattern, id: 'software', verses: ['software', 'software'] }],
    });
    expect(catalog.verses[0].itemKeys).toEqual([
      'commons:shared',
      'commons:methods',
      'personal:software',
    ]);
  });
  it('preserves first-document metadata lookup and source identity, including missing documents', () => {
    const commons = [entry('shared'), entry('no-document')];
    const first = { ...document(commons[0]), collectionNames: ['Public methods'] };
    const second = {
      ...first,
      id: 'other-document',
      collectionNames: ['Must not replace the first'],
    };
    const catalog = fixture({
      commons,
      commonsSearchDocuments: [first, second],
      personal: [
        personalPattern,
        {
          ...personalPattern,
          id: 'my-methods',
          type: 'collection',
          title: 'My methods',
          items: ['shared'],
        },
      ],
    });
    const view = workspaceLibraryView(catalog, defaults);
    expect(
      view.results.find((e) => libraryEntryKey(e) === 'commons:shared')?.collectionNames,
    ).toEqual(['Public methods']);
    expect(
      view.results.find((e) => libraryEntryKey(e) === 'personal:shared')?.collectionNames,
    ).toEqual(['My methods']);
    expect(view.results.find((e) => e.id === 'no-document')?.collectionNames).toBeUndefined();
    expect(catalog.collectionNames.get('commons:shared')).toBe(first.collectionNames);
  });
  it('uses existing aliases, tags, bodies and relationship names for search', () => {
    const e = entry('shared');
    const catalog = fixture({
      commons: [e],
      commonsSearchDocuments: [
        {
          ...document(e),
          aliases: ['Subscription'],
          tags: ['event-driven'],
          body: 'Broadcast notifications',
          verseNames: ['Software engineering'],
          collectionNames: ['Creational tools'],
        },
      ],
    });
    for (const query of [
      'Subscription',
      'event-driven',
      'Broadcast',
      'engineering',
      'Creational',
    ]) {
      expect(keys(workspaceLibraryView(catalog, { ...defaults, query }).results)).toEqual([
        'commons:shared',
      ]);
    }
  });
});

describe('workspace library display', () => {
  it.each([
    [[], 'all'],
    [['pattern'], 'pattern'],
    [['collection'], 'collection'],
    [['verse'], 'all'],
    [['concept'], 'all'],
    [['practice'], 'all'],
    [['collection', 'pattern'], 'all'],
  ] as const)('preserves the mount-time category for %j', (types, expected) => {
    expect(initialLibraryCategory(types)).toBe(expected);
  });
  it('counts only saved public references and owned private browse entries', () => {
    const catalog = fixture({ personal: [personalPattern] });
    const view = workspaceLibraryView(catalog, {
      ...defaults,
      scope: 'saved',
      savedEntries: [
        saved('builder'),
        saved('builder'),
        saved('missing'),
        saved('shared', 'another-source'),
      ],
    });
    expect(view.myLibraryCount).toBe(2);
    expect(keys(view.results)).toEqual(['personal:shared', 'commons:builder']);
    expect(view.emptyLibrary).toBe(false);
  });
  it('combines saved, category, verse, query and minimum-rating filters without ID collisions', () => {
    const catalog = fixture({ personal: [personalPattern] });
    const view = workspaceLibraryView(catalog, {
      ...defaults,
      scope: 'saved',
      savedEntries: [saved('shared')],
      ratings: [rating('shared', 2), rating('shared', 0, 'personal')],
      ratingFilter: 'useful',
      selectedVerse: 'commons:software',
      category: 'pattern',
      query: 'shared',
    });
    expect(keys(view.results)).toEqual(['commons:shared']);
    expect(view.myLibraryCount).toBe(2);
    expect(view.visibleVerses.map((v) => v.key)).toEqual(['commons:software']);
  });
  it('useful includes very useful, while very useful excludes useful, negative and unrated', () => {
    const catalog = fixture();
    const ratings = [rating('shared', 2), rating('builder', 1), rating('methods', 0)];
    expect(
      keys(workspaceLibraryView(catalog, { ...defaults, ratings, ratingFilter: 'useful' }).results),
    ).toEqual(['commons:shared', 'commons:builder']);
    expect(
      keys(workspaceLibraryView(catalog, { ...defaults, ratings, ratingFilter: 'very' }).results),
    ).toEqual(['commons:shared']);
    expect(workspaceLibraryView(catalog, { ...defaults, ratingFilter: 'useful' }).results).toEqual(
      [],
    );
  });
  it('keeps saved verse navigation independent of query, category and ratings', () => {
    const catalog = fixture();
    const view = workspaceLibraryView(catalog, {
      ...defaults,
      scope: 'saved',
      savedEntries: [saved('methods')],
      query: 'no matching title',
      category: 'pattern',
      ratingFilter: 'very',
    });
    expect(view.results).toEqual([]);
    expect(view.visibleVerses.map((v) => v.title)).toEqual(['Software']);
    expect(view.emptyLibrary).toBe(false);
  });
  it('resets an unavailable saved verse without filtering away the remaining library', () => {
    const catalog = fixture();
    const view = workspaceLibraryView(catalog, {
      ...defaults,
      scope: 'saved',
      selectedVerse: 'commons:software',
      savedEntries: [saved('builder')],
    });
    expect(view.selectedVerse).toBe('all');
    expect(keys(view.results)).toEqual(['commons:builder']);
    const empty = workspaceLibraryView(catalog, {
      ...defaults,
      scope: 'saved',
      selectedVerse: 'commons:software',
    });
    expect(empty.visibleVerses).toEqual([]);
    expect(empty.selectedVerse).toBe('all');
    expect(empty.emptyLibrary).toBe(true);
  });
  it('retains empty or unknown verse filters in Explore', () => {
    const catalog = fixture();
    for (const selectedVerse of ['commons:empty', 'unknown']) {
      const view = workspaceLibraryView(catalog, { ...defaults, selectedVerse });
      expect(view.selectedVerse).toBe(selectedVerse);
      expect(view.results).toEqual([]);
      expect(view.visibleVerses).toEqual(catalog.verses);
    }
  });
  it('hidden controls ignore saved/rating restrictions but retain category filtering and limits', () => {
    const view = workspaceLibraryView(fixture({ personal: [personalPattern] }), {
      ...defaults,
      scope: 'saved',
      showControls: false,
      category: 'pattern',
      ratingFilter: 'very',
      limit: 2,
    });
    expect(keys(view.results)).toEqual(['personal:shared', 'commons:shared', 'commons:builder']);
    expect(view.visibleResults).toHaveLength(2);
    expect(view.resultLabel).toBe('2 of 3 entries');
  });
  it('applies featured order only to empty searches, puts private entries first and retains stable ties', () => {
    const catalog = fixture({
      personal: [personalPattern, { ...personalPattern, id: 'private-second' }],
    });
    const featuredRank = new Map([
      ['builder', 0],
      ['shared', 1],
    ]);
    const view = workspaceLibraryView(catalog, { ...defaults, query: '  ', featuredRank });
    expect(keys(view.results)).toEqual([
      'personal:shared',
      'personal:private-second',
      'commons:builder',
      'commons:shared',
      'commons:methods',
    ]);
    const query = 'About';
    expect(
      keys(workspaceLibraryView(catalog, { ...defaults, query, featuredRank }).results),
    ).toEqual(catalog.search.search(query).map(libraryEntryKey));
    expect(keys(workspaceLibraryView(catalog, defaults).results)).toEqual(
      catalog.library.entries.map(libraryEntryKey),
    );
  });
  it('projects private editor and canonical public URLs without importing host routing', () => {
    const view = workspaceLibraryView(fixture({ personal: [personalPattern] }), defaults);
    expect(view.results.find((e) => e.sourceId === 'personal')?.url).toBe('/base/editor?id=shared');
    expect(view.results.find((e) => e.sourceId === 'commons' && e.type === 'pattern')?.url).toBe(
      '/pattern/shared',
    );
    expect(view.results.find((e) => e.type === 'collection')?.url).toBe('/collection/methods');
  });
  it('retains singular, plural, zero and limited result labels and clear-filter rules', () => {
    const catalog = fixture();
    expect(workspaceLibraryView(catalog, defaults).resultLabel).toBe('3 entries');
    expect(workspaceLibraryView(catalog, { ...defaults, limit: 0 }).resultLabel).toBe(
      '0 of 3 entries',
    );
    const matched = workspaceLibraryView(catalog, { ...defaults, query: 'builder' });
    expect(matched.resultLabel).toBe('1 match');
    expect(matched.hasSearchOrFilters).toBe(true);
    expect(
      workspaceLibraryView(catalog, { ...defaults, query: 'About', limit: 1 }).resultLabel,
    ).toBe('1 of 3 matches');
    expect(workspaceLibraryView(catalog, { ...defaults, query: 'unknown-term' }).resultLabel).toBe(
      '0 matches',
    );
    expect(
      workspaceLibraryView(catalog, {
        ...defaults,
        category: 'collection',
        initialCategory: 'collection',
      }).hasSearchOrFilters,
    ).toBe(false);
    expect(
      workspaceLibraryView(catalog, { ...defaults, ratingFilter: 'useful' }).hasSearchOrFilters,
    ).toBe(true);
  });
  it('does not mutate inputs or rebuild the catalog/search for annotation and filter changes', () => {
    const commons = Object.freeze([entry('shared'), entry('builder')].map((e) => Object.freeze(e)));
    const personal = Object.freeze([Object.freeze(personalPattern)]);
    const catalog = fixture({ commons, personal, commonsSearchDocuments: commons.map(document) });
    const before = structuredClone({ commons, personal, verses: catalog.verses });
    const search = catalog.search;
    for (const scope of ['saved', 'explore'] as const)
      for (const ratingFilter of ['any', 'useful', 'very'] as const) {
        workspaceLibraryView(catalog, {
          ...defaults,
          scope,
          ratingFilter,
          featuredRank: new Map([['builder', 0]]),
        });
        expect(catalog.search).toBe(search);
      }
    expect({ commons, personal, verses: catalog.verses }).toEqual(before);
  });
  it('preserves subset, source identity and search order across generated combinations of filters', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.integer({ min: 0, max: 30 }), { minLength: 1, maxLength: 20 }),
        fc.boolean(),
        fc.constantFrom('any', 'useful', 'very'),
        fc.boolean(),
        (ids, onlySaved, ratingFilter, searching) => {
          const commons = ids.map((id) => entry(`item-${id}`));
          const personal = ids.map((id) => ({ ...personalPattern, id: `item-${id}`, verses: [] }));
          const catalog = fixture({
            commons,
            personal,
            commonsSearchDocuments: commons.map(document),
          });
          const savedEntries = ids.filter((id) => id % 2 === 0).map((id) => saved(`item-${id}`));
          const ratings = ids.map((id) => rating(`item-${id}`, (id % 3) as 0 | 1 | 2));
          const input = {
            ...defaults,
            savedEntries,
            ratings,
            scope: onlySaved ? ('saved' as const) : ('explore' as const),
            ratingFilter,
            query: searching ? 'About' : '',
          };
          const results = workspaceLibraryView(catalog, input).results;
          const expected = catalog.search.search(input.query).filter((e) => {
            const id = Number(e.id.slice(5));
            const inScope = !onlySaved || e.sourceId === 'personal' || id % 2 === 0;
            const rated =
              e.sourceId === 'commons' && (ratingFilter === 'very' ? id % 3 === 2 : id % 3 >= 1);
            return inScope && (ratingFilter === 'any' || rated);
          });
          expect(keys(results)).toEqual(expected.map(libraryEntryKey));
          expect(new Set(keys(results)).size).toBe(results.length);
        },
      ),
      { numRuns: 100, seed: 16 },
    );
  });
});

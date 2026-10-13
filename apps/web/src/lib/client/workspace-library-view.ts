import type { EntityType } from '@patternverse/schema';
import type { RawEntity, SavedLibraryEntry, WorkspaceUsefulness } from '@patternverse/workspace';
import {
  createBrowsableLibrary,
  createLibrarySearch,
  createPersonalSource,
  isBrowsableLibraryType,
  isInMyLibrary,
  libraryEntryKey,
  libraryRefKey,
  savedLibraryKeys,
  type BrowsableLibraryType,
  type LibrarySearchDocument,
} from '@patternverse/workspace/library';
import type { EntitySummary } from '$lib/server/commons';
import { matchesLibraryRating, type LibraryRatingFilter } from './library-ratings';

export type LibraryVerse = Readonly<{
  id: string;
  sourceId: string;
  title: string;
  itemKeys: readonly string[];
}>;
export type LibraryCategory = BrowsableLibraryType | 'all';
export type LibraryScope = 'saved' | 'explore';

export function initialLibraryCategory(types: readonly EntityType[]): LibraryCategory {
  return types.length === 1 && isBrowsableLibraryType(types[0]) ? types[0] : 'all';
}

/** Rebuild only when content changes, not on each query, rating or scope change.
 * Search and source-qualified identity stay in the existing workspace library.
 * The host supplies its editor path; this module never imports routing or storage.
 */
export function createWorkspaceLibraryCatalog(input: {
  commons: readonly EntitySummary[];
  commonsSearchDocuments: readonly LibrarySearchDocument[];
  commonsVerses: readonly LibraryVerse[];
  personal: readonly RawEntity[];
  editorHref: string;
}) {
  const { commons, commonsSearchDocuments, commonsVerses, personal, editorHref } = input;
  const library = createBrowsableLibrary([
    createPersonalSource(personal, commons),
    {
      id: 'commons',
      name: 'Patternverse commons',
      readonly: true,
      entries: commons,
      searchDocuments: commonsSearchDocuments,
    },
  ]);
  const personalVerses = personal.filter((entry) => entry.type === 'verse');
  const localVerseIds = new Set(personalVerses.map((entry) => entry.id));
  const personalMembers = new Map<string, string[]>();
  for (const entry of personal) {
    if (!('verses' in entry)) continue;
    for (const id of new Set(entry.verses ?? [])) {
      const members = personalMembers.get(id) ?? [];
      members.push(libraryEntryKey(entry));
      personalMembers.set(id, members);
    }
  }
  const verses = [
    ...personalVerses.map((entry) => ({ ...entry, itemKeys: [] as readonly string[] })),
    ...commonsVerses,
  ].map((verse) => ({
    ...verse,
    key: libraryEntryKey(verse),
    itemKeys: [
      ...verse.itemKeys,
      ...((localVerseIds.has(verse.id) ? 'personal' : 'commons') === verse.sourceId
        ? (personalMembers.get(verse.id) ?? [])
        : []),
    ],
  }));
  const verseMembers = new Map<string, ReadonlySet<string>>();
  for (const verse of verses)
    if (!verseMembers.has(verse.key)) verseMembers.set(verse.key, new Set(verse.itemKeys));
  const collectionNames = new Map<string, readonly string[]>();
  for (const document of library.searchDocuments) {
    const key = libraryRefKey({ sourceId: document.sourceId, entityId: document.entityId });
    // Preserve the old first-document lookup, including source identity.
    if (!collectionNames.has(key)) collectionNames.set(key, document.collectionNames);
  }
  const counts = {
    total: library.entries.length,
    personal: library.entries.filter((entry) => entry.sourceId === 'personal').length,
    commons: library.entries.filter((entry) => entry.sourceId === 'commons').length,
  };
  return {
    library,
    search: createLibrarySearch(library),
    verses,
    verseMembers,
    collectionNames,
    counts,
    editorHref,
  };
}
export type WorkspaceLibraryCatalog = ReturnType<typeof createWorkspaceLibraryCatalog>;

/** Pure website projection; does not reinterpret search or rating semantics. */
export function workspaceLibraryView(
  catalog: WorkspaceLibraryCatalog,
  input: {
    savedEntries: readonly SavedLibraryEntry[];
    ratings: readonly WorkspaceUsefulness[];
    scope: LibraryScope;
    selectedVerse: string;
    query: string;
    category: LibraryCategory;
    initialCategory: LibraryCategory;
    ratingFilter: LibraryRatingFilter;
    showControls: boolean;
    featuredRank: ReadonlyMap<string, number>;
    limit?: number;
  },
) {
  const savedKeys = savedLibraryKeys(input.savedEntries);
  const ratings = new Map(
    input.ratings.map((entry) => [libraryRefKey(entry.ref), entry.usefulness]),
  );
  const mine = new Set(
    catalog.library.entries.filter((entry) => isInMyLibrary(entry, savedKeys)).map(libraryEntryKey),
  );
  // Navigation depends on the full library, never the current search/category/rating filter.
  const visibleVerses =
    input.scope === 'explore'
      ? catalog.verses
      : catalog.verses.filter((verse) => verse.itemKeys.some((key) => mine.has(key)));
  const selectedVerse =
    input.scope === 'saved' &&
    input.selectedVerse !== 'all' &&
    !visibleVerses.some((verse) => verse.key === input.selectedVerse)
      ? 'all'
      : input.selectedVerse;
  const verseMembers =
    selectedVerse === 'all' ? null : (catalog.verseMembers.get(selectedVerse) ?? new Set<string>());
  const matches = catalog.search
    .search(input.query)
    .filter(
      (entry) =>
        (!input.showControls || input.scope === 'explore' || mine.has(libraryEntryKey(entry))) &&
        (input.category === 'all' || entry.type === input.category) &&
        (!verseMembers || verseMembers.has(libraryEntryKey(entry))) &&
        (!input.showControls ||
          matchesLibraryRating(ratings.get(libraryEntryKey(entry)) ?? null, input.ratingFilter)),
    );
  const ordered =
    input.query.trim() || input.featuredRank.size === 0
      ? matches
      : [...matches].sort((left, right) => {
          if (left.sourceId !== right.sourceId) return left.sourceId === 'personal' ? -1 : 1;
          return (
            (input.featuredRank.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
            (input.featuredRank.get(right.id) ?? Number.MAX_SAFE_INTEGER)
          );
        });
  const results = ordered.map((entry): EntitySummary => ({
    ...entry,
    collectionNames: catalog.collectionNames.get(libraryEntryKey(entry)),
    url:
      entry.sourceId === 'personal'
        ? `${catalog.editorHref}?id=${encodeURIComponent(entry.id)}`
        : `/${entry.type}/${entry.id}`,
  }));
  const visibleResults = input.limit === undefined ? results : results.slice(0, input.limit);
  const resultLabel = `${visibleResults.length}${visibleResults.length < results.length ? ` of ${results.length}` : ''} ${
    input.query.trim()
      ? results.length === 1
        ? 'match'
        : 'matches'
      : results.length === 1
        ? 'entry'
        : 'entries'
  }`;
  return {
    results,
    visibleResults,
    visibleVerses,
    selectedVerse,
    resultLabel,
    myLibraryCount: mine.size,
    emptyLibrary: input.scope === 'saved' && !mine.size,
    hasSearchOrFilters:
      Boolean(input.query.trim()) ||
      input.category !== input.initialCategory ||
      selectedVerse !== 'all' ||
      input.ratingFilter !== 'any',
  };
}

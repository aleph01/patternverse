import {
  entityRefKey,
  type EntityStatus,
  type EntityType,
  type RawEntity,
} from '@patternverse/schema';
import MiniSearch from 'minisearch';
import type { SavedLibraryEntry } from './ownership.js';

export type LibraryEntry = {
  readonly id: string;
  readonly sourceId: string;
  readonly type: EntityType;
  readonly title: string;
  readonly summary: string;
  readonly status: EntityStatus;
};

export type LibrarySearchDocument = {
  readonly id: string;
  readonly entityId: string;
  readonly sourceId: string;
  readonly type: EntityType;
  readonly status: EntityStatus;
  readonly title: string;
  readonly aliases: readonly string[];
  readonly tags?: readonly string[];
  readonly summary: string;
  readonly body: string;
  readonly verseNames: readonly string[];
  readonly collectionNames: readonly string[];
};

export type LibrarySource = {
  readonly id: string;
  readonly name: string;
  readonly readonly: boolean;
  readonly entries: readonly LibraryEntry[];
  readonly searchDocuments: readonly LibrarySearchDocument[];
};

export type Library = {
  readonly sources: readonly LibrarySource[];
  readonly entries: readonly LibraryEntry[];
  readonly searchDocuments: readonly LibrarySearchDocument[];
};

export type LibraryFilters = {
  readonly sourceId?: string;
  readonly type?: EntityType;
};

export type LibrarySearchResult = LibraryEntry & {
  readonly score: number;
  readonly terms: readonly string[];
};

export type LibrarySearch = {
  readonly search: (query: string, filters?: LibraryFilters) => readonly LibrarySearchResult[];
  readonly searchWithFallback: (
    query: string,
    filters?: LibraryFilters,
    accept?: (entry: LibraryEntry) => boolean,
  ) => LibrarySearchGroups;
};

export type LibrarySearchGroups = {
  readonly strict: readonly LibrarySearchResult[];
  readonly broader: readonly LibrarySearchResult[];
};

// Only fallback queries drop English conversational filler. Strict search and
// indexed content keep every term, including negations such as "not"/"without".
const fallbackFiller = new Set(
  (
    'a an the i me my we us our you your he him his she her it its they them their ' +
    'am is are was were be been being do does did have has had can could would should ' +
    'will shall may might must how what when where who which why that this these those ' +
    'and or but if then than as at by for from in into of on to with about please'
  ).split(' '),
);
const tokenizeQuery: (query: string) => string[] = MiniSearch.getDefault('tokenize');
const queryTerms = (query: string): string[] => [
  ...new Set(tokenizeQuery(query).map((term) => term.toLowerCase())),
];

/** Stable identity for browsing; keep this encoding compatible with saved refs and ratings. */
export const libraryEntryKey = (entry: Pick<LibraryEntry, 'sourceId' | 'id'>): string =>
  entityRefKey({ sourceId: entry.sourceId, entityId: entry.id });
export const libraryRefKey = entityRefKey;

export type BrowsableLibraryType = Extract<EntityType, 'pattern' | 'collection'>;
export const isBrowsableLibraryType = (type: EntityType): type is BrowsableLibraryType =>
  type === 'pattern' || type === 'collection';

/** Only for the existing bare-ID authoring fields, never for source-qualified public refs.
 * Private entries deliberately shadow public ones, including entries of a different type.
 * External entries are in fallback-priority order; keep the first matching external ID.
 */
export function legacyRelationshipIndex<
  Local extends { id: string },
  External extends { id: string },
>(
  personal: readonly Local[],
  external: readonly External[],
): ReadonlyMap<string, Local | External> {
  const index = new Map<string, Local | External>();
  for (const entity of external) if (!index.has(entity.id)) index.set(entity.id, entity);
  for (const entity of personal) index.set(entity.id, entity);
  return index;
}

/** Source-qualified membership: private articles are already yours; saved public ones remain references. */
export const savedLibraryKeys = (saved: readonly SavedLibraryEntry[]): ReadonlySet<string> =>
  new Set(saved.map(({ ref }) => libraryRefKey(ref)));

export const isInMyLibrary = (
  entry: Pick<LibraryEntry, 'sourceId' | 'id'>,
  savedKeys: ReadonlySet<string>,
): boolean => entry.sourceId === 'personal' || savedKeys.has(libraryEntryKey(entry));

const uniqueEntries = (entries: readonly LibraryEntry[]): readonly LibraryEntry[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = libraryEntryKey(entry);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const uniqueDocuments = (
  documents: readonly LibrarySearchDocument[],
): readonly LibrarySearchDocument[] => {
  const seen = new Set<string>();
  return documents.filter((document) => {
    if (seen.has(document.id)) return false;
    seen.add(document.id);
    return true;
  });
};

export const summarizePersonalEntity = (entity: RawEntity): LibraryEntry => ({
  id: entity.id,
  sourceId: entity.sourceId,
  type: entity.type,
  title: entity.title,
  summary: entity.summary ?? '',
  status: entity.status,
});

export const createPersonalSearchDocuments = (
  personal: readonly RawEntity[],
  externalEntries: readonly LibraryEntry[] = [],
): readonly LibrarySearchDocument[] => {
  const collections = personal.filter((entity) => entity.type === 'collection');
  const relationships = legacyRelationshipIndex(personal, externalEntries);

  return personal.map((entity) => ({
    id: libraryEntryKey(entity),
    entityId: entity.id,
    sourceId: entity.sourceId,
    type: entity.type,
    status: entity.status,
    title: entity.title,
    aliases: entity.aliases ?? [],
    tags: entity.tags ?? [],
    summary: entity.summary ?? '',
    body: entity.body,
    verseNames:
      'verses' in entity
        ? (entity.verses ?? []).flatMap((id) => {
            const title = relationships.get(id)?.title;
            return title ? [title] : [];
          })
        : [],
    collectionNames: collections
      .filter((collection) => collection.items.includes(entity.id))
      .map((collection) => collection.title),
  }));
};

export const createPersonalSource = (
  personal: readonly RawEntity[],
  externalEntries: readonly LibraryEntry[] = [],
): LibrarySource => ({
  id: 'personal',
  name: 'My Workspace',
  readonly: false,
  entries: personal.map(summarizePersonalEntity),
  searchDocuments: createPersonalSearchDocuments(personal, externalEntries),
});

export const createLibrary = (sources: readonly LibrarySource[]): Library => ({
  sources,
  entries: uniqueEntries(sources.flatMap((source) => source.entries)),
  searchDocuments: uniqueDocuments(sources.flatMap((source) => source.searchDocuments)),
});

/** Browsing projection; the general library still supports legacy concepts and practices. */
export const createBrowsableLibrary = (sources: readonly LibrarySource[]): Library =>
  createLibrary(
    sources.map((source) => ({
      ...source,
      entries: source.entries.filter((entry) => isBrowsableLibraryType(entry.type)),
      searchDocuments: source.searchDocuments.filter((document) =>
        isBrowsableLibraryType(document.type),
      ),
    })),
  );

/** Compatibility helper retained for existing Milestone 3 consumers. */
export const mergeLibraryEntries = (
  commons: readonly LibraryEntry[],
  personal: readonly RawEntity[],
): readonly LibraryEntry[] =>
  createLibrary([
    createPersonalSource(personal, commons),
    {
      id: 'commons',
      name: 'Commons',
      readonly: true,
      entries: commons,
      searchDocuments: [],
    },
  ]).entries;

const matchesFilters = (
  entry: Pick<LibraryEntry, 'sourceId' | 'type'>,
  filters: LibraryFilters,
): boolean =>
  (!filters.sourceId || entry.sourceId === filters.sourceId) &&
  (!filters.type || entry.type === filters.type);

export const createLibrarySearch = (library: Library): LibrarySearch => {
  const entries = new Map(library.entries.map((entry) => [libraryEntryKey(entry), entry] as const));
  let index: MiniSearch<LibrarySearchDocument> | undefined;
  const getIndex = () => {
    if (index) return index;
    index = new MiniSearch<LibrarySearchDocument>({
      fields: ['title', 'aliases', 'tags', 'summary', 'body', 'verseNames', 'collectionNames'],
      storeFields: ['sourceId', 'type'],
      searchOptions: {
        boost: { title: 5, aliases: 4, tags: 3, summary: 2, verseNames: 1.5, collectionNames: 1.5 },
        prefix: true,
        fuzzy: 0.2,
      },
    });
    index.addAll(library.searchDocuments);
    return index;
  };

  const search: LibrarySearch['search'] = (query, filters = {}) => {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return library.entries
        .filter((entry) => matchesFilters(entry, filters))
        .map((entry) => ({ ...entry, score: 0, terms: [] }));
    }

    return getIndex()
      .search(normalizedQuery, {
        combineWith: 'AND',
        filter: (result) =>
          matchesFilters(
            {
              sourceId: String(result.sourceId),
              type: result.type as EntityType,
            },
            filters,
          ),
      })
      .flatMap((result) => {
        const entry = entries.get(String(result.id));
        return entry ? [{ ...entry, score: result.score, terms: result.terms ?? [] }] : [];
      });
  };

  return {
    search,
    searchWithFallback: (query, filters = {}, accept = () => true) => {
      const strict = search(query, filters).filter(accept);
      const groups = { strict, broader: [] as LibrarySearchResult[] };
      // Do not build the index for browsing or change single-term searches.
      const tokens = queryTerms(query);
      if (strict.length >= 3 || tokens.length < 2) return groups;
      const meaningful = tokens.filter((term) => !fallbackFiller.has(term));
      if (meaningful.length < 2) return groups;

      const minimumCoverage = Math.max(2, Math.ceil(meaningful.length / 2));
      const seen = new Set(strict.map(libraryEntryKey));
      groups.broader = getIndex()
        .search(meaningful.join(' '), { combineWith: 'OR' })
        // Count original query terms, not the number of fuzzy/prefix expansions.
        .filter((result) => new Set(result.queryTerms).size >= minimumCoverage)
        .sort(
          (left, right) =>
            new Set(right.queryTerms).size - new Set(left.queryTerms).size ||
            right.score - left.score,
        )
        .flatMap((result) => {
          const entry = entries.get(String(result.id));
          if (!entry || !matchesFilters(entry, filters) || !accept(entry)) return [];
          const key = libraryEntryKey(entry);
          if (seen.has(key)) return [];
          seen.add(key);
          return [{ ...entry, score: result.score, terms: result.terms ?? [] }];
        });
      return groups;
    },
  };
};

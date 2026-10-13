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
};

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
      name: 'Patternverse commons',
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
  const index = new MiniSearch<LibrarySearchDocument>({
    fields: ['title', 'aliases', 'tags', 'summary', 'body', 'verseNames', 'collectionNames'],
    storeFields: ['sourceId', 'type'],
    searchOptions: {
      boost: { title: 5, aliases: 4, tags: 3, summary: 2, verseNames: 1.5, collectionNames: 1.5 },
      prefix: true,
      fuzzy: 0.2,
    },
  });
  index.addAll(library.searchDocuments);

  return {
    search: (query, filters = {}) => {
      const normalizedQuery = query.trim();
      if (!normalizedQuery) {
        return library.entries
          .filter((entry) => matchesFilters(entry, filters))
          .map((entry) => ({ ...entry, score: 0, terms: [] }));
      }

      return index
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
    },
  };
};

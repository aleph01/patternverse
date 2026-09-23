import type { EntityStatus, EntityType, RawEntity } from '@patternverse/schema';
import MiniSearch from 'minisearch';

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

const referenceKey = (entry: Pick<LibraryEntry, 'sourceId' | 'id'>): string =>
  `${entry.sourceId}:${entry.id}`;

const uniqueEntries = (entries: readonly LibraryEntry[]): readonly LibraryEntry[] => {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    const key = referenceKey(entry);
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

const titleForId = (
  id: string,
  personal: readonly RawEntity[],
  externalEntries: readonly LibraryEntry[],
): string | undefined =>
  personal.find((candidate) => candidate.id === id)?.title ??
  externalEntries.find((candidate) => candidate.id === id)?.title;

export const createPersonalSearchDocuments = (
  personal: readonly RawEntity[],
  externalEntries: readonly LibraryEntry[] = [],
): readonly LibrarySearchDocument[] => {
  const collections = personal.filter((entity) => entity.type === 'collection');

  return personal.map((entity) => ({
    id: referenceKey(entity),
    entityId: entity.id,
    sourceId: entity.sourceId,
    type: entity.type,
    status: entity.status,
    title: entity.title,
    aliases: entity.aliases ?? [],
    summary: entity.summary ?? '',
    body: entity.body,
    verseNames:
      'verses' in entity
        ? (entity.verses ?? []).flatMap((id) => {
            const title = titleForId(id, personal, externalEntries);
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
  name: 'My Patternverse',
  readonly: false,
  entries: personal.map(summarizePersonalEntity),
  searchDocuments: createPersonalSearchDocuments(personal, externalEntries),
});

export const createLibrary = (sources: readonly LibrarySource[]): Library => ({
  sources,
  entries: uniqueEntries(sources.flatMap((source) => source.entries)),
  searchDocuments: uniqueDocuments(sources.flatMap((source) => source.searchDocuments)),
});

/** Compatibility helper retained for existing Milestone 3 consumers. */
export const mergeLibraryEntries = (
  commons: readonly LibraryEntry[],
  personal: readonly RawEntity[],
): readonly LibraryEntry[] =>
  createLibrary([
    createPersonalSource(personal, commons),
    {
      id: 'commons',
      name: 'Patternverse Commons',
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
  const entries = new Map(library.entries.map((entry) => [referenceKey(entry), entry] as const));
  const index = new MiniSearch<LibrarySearchDocument>({
    fields: ['title', 'aliases', 'summary', 'body', 'verseNames', 'collectionNames'],
    storeFields: ['sourceId', 'type'],
    searchOptions: {
      boost: { title: 5, aliases: 4, summary: 2, verseNames: 1.5, collectionNames: 1.5 },
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

import type { CompiledCorpus, CompiledEntity } from '@patternverse/compiler';
import { entityRefKey } from '@patternverse/compiler/references';
import { createLibrary, createLibrarySearch } from '@patternverse/workspace/library';
import { THERAPY_LIBRARY, REFRAMING_LIBRARY } from '@patternverse/workspace/public-practices';
import type { InspectDefinition } from './definition.js';

const SOURCE = 'commons';
const SITE = 'https://patternverse.org';
export class PublicLibraryError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const summary = (entry: CompiledEntity) => ({
  id: entry.id,
  sourceId: entry.sourceId,
  type: entry.type,
  title: entry.title,
  summary: entry.summary ?? '',
  url: `${SITE}/${entry.type}/${entry.id}`,
});

/** Published Commons only. No workspace, run, user, filesystem, or network access. */
export function createPublicLibrary(
  corpus: CompiledCorpus,
  dependencySources: Readonly<Record<string, string>>,
  inspect: InspectDefinition,
) {
  const entries = corpus.entities.filter(
    (entry) => entry.sourceId === SOURCE && entry.status === 'published',
  );
  const index = new Map(entries.map((entry) => [entityRefKey(entry.ref), entry]));
  const search = createLibrarySearch(
    createLibrary([
      {
        id: SOURCE,
        name: 'Patternverse Commons',
        readonly: true,
        entries: entries.map((entry) => ({ ...summary(entry), status: entry.status })),
        searchDocuments: corpus.searchDocuments
          .filter((document) => index.has(entityRefKey(document.ref)))
          .map((document) => ({ ...document, entityId: document.ref.entityId })),
      },
    ]),
  );
  const related = (refs: CompiledEntity['links'] | CompiledEntity['verseMemberships']) =>
    refs.flatMap((ref) => {
      const entry = index.get(entityRefKey('target' in ref ? ref.target : ref));
      return entry ? [summary(entry)] : [];
    });
  const find = (id: string, sourceId = SOURCE) => {
    const entry = index.get(entityRefKey({ sourceId, entityId: id }));
    if (!entry || sourceId !== SOURCE)
      throw new PublicLibraryError('NOT_FOUND', 'This published Commons entry does not exist.');
    return entry;
  };
  const practices = (entry: CompiledEntity) => {
    const authored = (item: CompiledEntity) => ({
      entry: item,
      root: `commons.${item.id}`,
      source: item.languagePracticeSource!,
    });
    const attached = entry.implementedByPractices.flatMap((ref) => {
      const child = index.get(entityRefKey(ref));
      return child?.type === 'practice' && child.languagePracticeSource ? [authored(child)] : [];
    });
    if (entry.languagePracticeSource) return [authored(entry), ...attached];
    if (attached.length) return attached;
    const bundled = [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].find(
      (item) => item.slug === entry.id,
    );
    // Use the website's existing public mapping, never an arbitrary caller-supplied source name.
    const source = bundled && dependencySources[bundled.id];
    return source ? [{ entry, root: bundled.id, source }, ...attached] : attached;
  };
  const projection = (entry: CompiledEntity) => ({
    ...summary(entry),
    verses: related(entry.verseMemberships),
    collections: related(entry.collectionMemberships),
    hasPractice: practices(entry).length > 0,
  });

  return {
    searchPatterns({
      query = '',
      verse,
      limit = 20,
      offset = 0,
    }: {
      query?: string;
      verse?: string;
      limit?: number;
      offset?: number;
    }) {
      // Same lexical ranking as the website; verse filtering uses resolved membership.
      if (verse && find(verse).type !== 'verse')
        throw new PublicLibraryError('NOT_FOUND', 'This published Commons verse does not exist.');
      const matches = search
        .search(query, { sourceId: SOURCE, type: 'pattern' })
        .filter((match) => {
          const entry = find(match.id);
          return (
            !verse ||
            entry.verseMemberships.some((ref) => ref.sourceId === SOURCE && ref.entityId === verse)
          );
        });
      return {
        schemaVersion: 1 as const,
        results: matches
          .slice(offset, offset + limit)
          .map((match) => ({ ...projection(find(match.id)), score: match.score })),
        pagination: {
          offset,
          limit,
          total: matches.length,
          hasMore: offset + limit < matches.length,
        },
      };
    },
    getPattern(id: string, sourceId = SOURCE) {
      const entry = find(id, sourceId);
      if (entry.type !== 'pattern')
        throw new PublicLibraryError('NOT_FOUND', 'This entry is not a published pattern.');
      return {
        schemaVersion: 1 as const,
        pattern: {
          ...projection(entry),
          aliases: entry.aliases ?? [],
          tags: entry.tags ?? [],
          ...(entry.attribution ? { attribution: entry.attribution } : {}),
          articleMarkdown: entry.body,
          relatedPatterns: related(entry.links).filter((item) => item.type === 'pattern'),
          practices: practices(entry).map((item) => summary(item.entry)),
        },
      };
    },
    getPractice(id: string, sourceId = SOURCE, practiceId?: string) {
      const entry = find(id, sourceId);
      if (entry.type !== 'pattern' && entry.type !== 'practice')
        throw new PublicLibraryError('NO_PRACTICE', 'This entry is not a pattern or practice.');
      const available = practices(entry);
      const chosen = practiceId
        ? available.find((item) => item.entry.id === practiceId)
        : available[0];
      if (!chosen)
        throw new PublicLibraryError(
          'NO_PRACTICE',
          'No Pattern Language practice is available for this selection.',
        );
      if (!practiceId && !entry.languagePracticeSource && available.length > 1)
        throw new PublicLibraryError(
          'CHOOSE_PRACTICE',
          'More than one practice is available. Retrieve the pattern and specify practiceId.',
        );
      let definition;
      try {
        definition = inspect({
          root: chosen.root,
          patterns: { ...dependencySources, [chosen.root]: chosen.source },
        });
      } catch {
        throw new PublicLibraryError(
          'INVALID_PRACTICE',
          'This practice or its dependencies could not be validated. Nothing was executed.',
        );
      }
      return {
        schemaVersion: 1 as const,
        entry: summary(entry),
        practice: summary(chosen.entry),
        language: 'pattern-language' as const,
        root: definition.root,
        source: definition.sources[definition.root]!,
        revision: definition.revision,
        snapshotId: definition.snapshot_id,
        inputs: definition.inputs,
        outputs: definition.outputs,
        dependencies: Object.entries(definition.sources)
          .filter(([name]) => name !== definition.root)
          .map(([name, source]) => ({ name, source })),
        execution: 'definition-only' as const,
      };
    },
  };
}
export type PublicLibrary = ReturnType<typeof createPublicLibrary>;

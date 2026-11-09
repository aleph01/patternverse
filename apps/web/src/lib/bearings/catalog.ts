import type { CompiledEntity } from '@patternverse/compiler';
import { compileCorpus } from '@patternverse/compiler/references';
import { parseMarkdownEntity } from '@patternverse/compiler/markdown';
import { serializeEntity } from '@patternverse/compiler/serialize';
import { entityRefKey, type EntityRef, type RawEntity } from '@patternverse/schema';
import { patternPracticeOptions } from '$lib/practice-options';

export type BearingsGroup = Readonly<{ key: string; title: string; sourceId: string }>;
export type BearingsPattern = Readonly<{
  sourceId: string;
  id: string;
  title: string;
  summary: string;
  verses: readonly BearingsGroup[];
  collections: readonly BearingsGroup[];
  practices: readonly Readonly<{ sourceId: string; id: string; title: string; source: string }>[];
}>;
export function bearingsCatalog(entities: readonly CompiledEntity[]): readonly BearingsPattern[] {
  const index = new Map(entities.map((entity) => [entityRefKey(entity.ref), entity]));
  const groups = (refs: readonly EntityRef[], ancestors = false): BearingsGroup[] => {
    const pending = [...refs],
      seen = new Set<string>(),
      result: BearingsGroup[] = [];
    while (pending.length) {
      const ref = pending.shift()!,
        key = entityRefKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      const entity = index.get(key);
      if (!entity || !['verse', 'collection'].includes(entity.type)) continue;
      result.push({ key, title: entity.title, sourceId: entity.sourceId });
      if (ancestors) pending.push(...entity.collectionMemberships);
    }
    return result.sort((a, b) => a.title.localeCompare(b.title));
  };
  return entities
    .filter((entity) => entity.type === 'pattern')
    .map((pattern) => ({
      sourceId: pattern.sourceId,
      id: pattern.id,
      title: pattern.title,
      summary: pattern.summary ?? '',
      verses: groups(pattern.verseMemberships),
      collections: groups(pattern.collectionMemberships, true),
      practices: patternPracticeOptions(
        pattern,
        entities.filter((entity) =>
          pattern.implementedByPractices.some(
            (ref) => ref.sourceId === entity.sourceId && ref.entityId === entity.id,
          ),
        ),
      ).flatMap((option) =>
        option.worksheetDefinition &&
        'source' in option.worksheetDefinition &&
        option.worksheetDefinition.source
          ? [
              {
                sourceId: option.ref.sourceId,
                id: option.ref.entityId,
                title: option.title,
                source: option.worksheetDefinition.source,
              },
            ]
          : [],
      ),
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
}
export function personalBearingsCatalog(
  personal: readonly RawEntity[],
  publicReferences: readonly CompiledEntity[] = [],
): readonly BearingsPattern[] {
  if (!personal.length) return [];
  const parsed = personal.flatMap((entity) => {
    const result = parseMarkdownEntity(serializeEntity(entity), {
      sourceId: entity.sourceId,
      sourcePath: entity.sourcePath ?? `${entity.id}.md`,
    });
    return result.entity ? [result.entity] : [];
  });
  return bearingsCatalog(
    compileCorpus(
      [...publicReferences, ...parsed],
      [
        { id: 'commons', name: 'Commons', readonly: true },
        { id: 'personal', name: 'My patterns', readonly: false },
      ],
      {
        includeDrafts: true,
      },
    ).entities,
  );
}

/** Preserve executable public practices while adding private collection memberships and practices. */
export function mergeBearingsCatalog(
  published: readonly BearingsPattern[],
  workspace: readonly BearingsPattern[],
): readonly BearingsPattern[] {
  const patterns = new Map(
    published.map((pattern) => [`${pattern.sourceId}:${pattern.id}`, pattern]),
  );
  for (const pattern of workspace) {
    const key = `${pattern.sourceId}:${pattern.id}`,
      existing = patterns.get(key);
    if (!existing) patterns.set(key, pattern);
    else {
      const practices = new Map(
        existing.practices.map((practice) => [`${practice.sourceId}:${practice.id}`, practice]),
      );
      for (const practice of pattern.practices)
        if (!practices.has(`${practice.sourceId}:${practice.id}`))
          practices.set(`${practice.sourceId}:${practice.id}`, practice);
      patterns.set(key, {
        ...existing,
        verses: pattern.verses,
        collections: pattern.collections,
        practices: [...practices.values()],
      });
    }
  }
  return [...patterns.values()].sort((a, b) => a.title.localeCompare(b.title));
}

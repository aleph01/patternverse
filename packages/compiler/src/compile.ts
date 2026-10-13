import {
  entityRefKey,
  type EntityRef,
  type PatternverseSource,
  type RawEntity,
} from '@patternverse/schema';

import type {
  CompileOptions,
  CompiledCorpus,
  CompiledEntity,
  CompilerDiagnostic,
  ParsedEntity,
  ResolvedWikiLink,
  SearchDocument,
  UnresolvedReference,
} from './types.js';

// Preserve the existing compiler/references API without a second identity implementation.
export { entityRefKey } from '@patternverse/schema';

const refFor = (entity: Pick<ParsedEntity, 'sourceId' | 'id'>): EntityRef => ({
  sourceId: entity.sourceId,
  entityId: entity.id,
});

const unique = <T>(values: readonly T[]): readonly T[] => [...new Set(values)];

const uniqueRefs = (refs: readonly EntityRef[]): readonly EntityRef[] => {
  const seen = new Set<string>();
  return refs.filter((ref) => {
    const key = entityRefKey(ref);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const levenshteinDistance = (left: string, right: string): number => {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);

  for (let leftIndex = 1; leftIndex <= left.length; leftIndex += 1) {
    const current = [leftIndex];
    for (let rightIndex = 1; rightIndex <= right.length; rightIndex += 1) {
      const substitutionCost = left[leftIndex - 1] === right[rightIndex - 1] ? 0 : 1;
      current[rightIndex] = Math.min(
        (current[rightIndex - 1] ?? 0) + 1,
        (previous[rightIndex] ?? 0) + 1,
        (previous[rightIndex - 1] ?? 0) + substitutionCost,
      );
    }
    previous.splice(0, previous.length, ...current);
  }

  return previous[right.length] ?? left.length;
};

const closestId = (reference: string, entityIds: readonly string[]): string | undefined => {
  const ranked = unique(entityIds)
    .map((id) => ({ id, distance: levenshteinDistance(reference, id) }))
    .sort((left, right) => left.distance - right.distance || left.id.localeCompare(right.id));
  const closest = ranked[0];
  const threshold = Math.max(2, Math.floor(reference.length * 0.3));
  return closest && closest.distance <= threshold ? closest.id : undefined;
};

const pushMapValue = <T>(map: Map<string, T[]>, key: string, value: T): void => {
  map.set(key, [...(map.get(key) ?? []), value]);
};

const detectCollectionCycles = (
  graph: ReadonlyMap<string, readonly string[]>,
): readonly (readonly string[])[] => {
  const visited = new Set<string>();
  const active = new Set<string>();
  const stack: string[] = [];
  const cycles = new Map<string, readonly string[]>();

  const visitNode = (key: string): void => {
    if (active.has(key)) {
      const cycleStart = stack.indexOf(key);
      const cycle = [...stack.slice(cycleStart), key];
      const members = cycle.slice(0, -1);
      const canonicalStart = members.reduce(
        (best, member, index) => (member < (members[best] ?? member) ? index : best),
        0,
      );
      const closingMember = members[canonicalStart];
      if (!closingMember) return;
      const canonical = [
        ...members.slice(canonicalStart),
        ...members.slice(0, canonicalStart),
        closingMember,
      ];
      cycles.set(canonical.join(' -> '), canonical);
      return;
    }
    if (visited.has(key)) return;

    active.add(key);
    stack.push(key);
    for (const child of graph.get(key) ?? []) visitNode(child);
    stack.pop();
    active.delete(key);
    visited.add(key);
  };

  for (const key of graph.keys()) visitNode(key);
  return [...cycles.values()];
};

export const compileCorpus = (
  rawEntities: readonly ParsedEntity[],
  sources: readonly PatternverseSource[],
  options: CompileOptions = {},
): CompiledCorpus => {
  const includeDrafts = options.includeDrafts ?? true;
  const personalSourceId = options.personalSourceId ?? 'personal';
  const commonsSourceId = options.commonsSourceId ?? 'commons';
  const entities = rawEntities.filter((entity) => includeDrafts || entity.status !== 'draft');
  const diagnostics: CompilerDiagnostic[] = [];
  const unresolvedReferences: UnresolvedReference[] = [];
  const entityIndex = new Map<string, ParsedEntity>();

  for (const entity of entities) {
    const key = entityRefKey(refFor(entity));
    const duplicate = entityIndex.get(key);
    if (duplicate) {
      diagnostics.push({
        code: 'duplicate-id',
        severity: 'error',
        file: entity.sourcePath,
        entity: refFor(entity),
        field: 'id',
        message: `Entity ID "${entity.id}" is duplicated within source "${entity.sourceId}".`,
        suggestion: 'Give the new entity a unique ID; published IDs must remain stable.',
      });
    } else {
      entityIndex.set(key, entity);
    }
  }

  const sourcePriority = (currentSourceId: string): readonly string[] =>
    unique([personalSourceId, currentSourceId, commonsSourceId]);

  const resolve = (
    entityId: string,
    currentSourceId: string,
    explicitSourceId?: string,
  ): ParsedEntity | undefined => {
    const candidates = explicitSourceId ? [explicitSourceId] : sourcePriority(currentSourceId);
    return candidates
      .map((sourceId) => entityIndex.get(entityRefKey({ sourceId, entityId })))
      .find((entity) => entity !== undefined);
  };

  const accessibleEntityIds = (currentSourceId: string): readonly string[] =>
    [...entityIndex.values()]
      .filter((entity) => sourcePriority(currentSourceId).includes(entity.sourceId))
      .map((entity) => entity.id);

  const reportUnresolved = (
    from: ParsedEntity,
    field: UnresolvedReference['field'],
    reference: string,
  ): void => {
    const suggestion = closestId(reference, accessibleEntityIds(from.sourceId));
    const unresolved = { from: refFor(from), field, reference } as const;
    unresolvedReferences.push(unresolved);
    diagnostics.push({
      code: 'unresolved-reference',
      severity: 'error',
      file: from.sourcePath,
      entity: refFor(from),
      field,
      reference,
      message: `Unknown entity ID: ${reference}`,
      ...(suggestion ? { suggestion: `Did you mean "${suggestion}"?` } : {}),
    });
  };

  const reportWrongType = (
    from: ParsedEntity,
    field: string,
    target: ParsedEntity,
    expected: string,
  ): void => {
    diagnostics.push({
      code: 'wrong-reference-type',
      severity: 'error',
      file: from.sourcePath,
      entity: refFor(from),
      field,
      reference: target.id,
      message: `Expected ${expected}, but "${target.id}" is a ${target.type}.`,
    });
  };

  const resolvedLinks = new Map<string, ResolvedWikiLink[]>();
  const backlinks = new Map<string, EntityRef[]>();
  const collectionItems = new Map<string, EntityRef[]>();
  const collectionMemberships = new Map<string, EntityRef[]>();
  const verseMemberships = new Map<string, EntityRef[]>();
  const verseMembers = new Map<string, EntityRef[]>();
  const implementsPatterns = new Map<string, EntityRef[]>();
  const implementedByPractices = new Map<string, EntityRef[]>();
  const collectionGraph = new Map<string, string[]>();

  for (const entity of entities) {
    const entityRef = refFor(entity);
    const entityKey = entityRefKey(entityRef);

    for (const link of entity.wikiLinks) {
      const target = resolve(link.entityId, entity.sourceId, link.sourceId);
      if (!target) {
        reportUnresolved(entity, 'body', link.entityId);
        continue;
      }

      const targetRef = refFor(target);
      pushMapValue(resolvedLinks, entityKey, {
        ...link,
        target: targetRef,
        resolvedLabel: link.label ?? target.title,
      });
      pushMapValue(backlinks, entityRefKey(targetRef), entityRef);
    }

    if ('verses' in entity) {
      for (const verseId of entity.verses ?? []) {
        const target = resolve(verseId, entity.sourceId);
        if (!target) {
          reportUnresolved(entity, 'verses', verseId);
        } else if (target.type !== 'verse') {
          reportWrongType(entity, 'verses', target, 'a Verse');
        } else {
          const targetRef = refFor(target);
          pushMapValue(verseMemberships, entityKey, targetRef);
          pushMapValue(verseMembers, entityRefKey(targetRef), entityRef);
        }
      }
    }

    if (entity.type === 'collection') {
      for (const itemId of entity.items) {
        const target = resolve(itemId, entity.sourceId);
        if (!target) {
          reportUnresolved(entity, 'items', itemId);
        } else if (target.type === 'verse') {
          reportWrongType(entity, 'items', target, 'a Pattern, Concept, Practice, or Collection');
        } else {
          const targetRef = refFor(target);
          pushMapValue(collectionItems, entityKey, targetRef);
          pushMapValue(collectionMemberships, entityRefKey(targetRef), entityRef);
          if (target.type === 'collection') {
            pushMapValue(collectionGraph, entityKey, entityRefKey(targetRef));
          }
        }
      }
    }

    if (entity.type === 'practice') {
      for (const patternId of entity.implements ?? []) {
        const target = resolve(patternId, entity.sourceId);
        if (!target) {
          reportUnresolved(entity, 'implements', patternId);
        } else if (target.type !== 'pattern') {
          reportWrongType(entity, 'implements', target, 'a Pattern');
        } else {
          const targetRef = refFor(target);
          pushMapValue(implementsPatterns, entityKey, targetRef);
          pushMapValue(implementedByPractices, entityRefKey(targetRef), entityRef);
        }
      }
    }
  }

  for (const cycle of detectCollectionCycles(collectionGraph)) {
    const first = cycle[0] ? entityIndex.get(cycle[0]) : undefined;
    diagnostics.push({
      code: 'collection-cycle',
      severity: 'error',
      file: first?.sourcePath,
      ...(first ? { entity: refFor(first) } : {}),
      field: 'items',
      message: `Collection cycle detected: ${cycle.join(' -> ')}`,
      suggestion: 'Remove one nested Collection reference to make the graph acyclic.',
    });
  }

  const compiledEntities: readonly CompiledEntity[] = entities.map((entity) => {
    const ref = refFor(entity);
    const key = entityRefKey(ref);
    return {
      ...entity,
      ref,
      links: resolvedLinks.get(key) ?? [],
      backlinks: uniqueRefs(backlinks.get(key) ?? []),
      collectionItems: collectionItems.get(key) ?? [],
      collectionMemberships: uniqueRefs(collectionMemberships.get(key) ?? []),
      verseMemberships: uniqueRefs(verseMemberships.get(key) ?? []),
      verseMembers: uniqueRefs(verseMembers.get(key) ?? []),
      implementsPatterns: uniqueRefs(implementsPatterns.get(key) ?? []),
      implementedByPractices: uniqueRefs(implementedByPractices.get(key) ?? []),
    };
  });

  const compiledIndex = new Map(
    compiledEntities.map((entity) => [entityRefKey(entity.ref), entity] as const),
  );

  const namesForRefs = (refs: readonly EntityRef[]): readonly string[] =>
    refs.flatMap((ref) => {
      const entity = compiledIndex.get(entityRefKey(ref));
      return entity ? [entity.title] : [];
    });

  const searchDocuments: readonly SearchDocument[] = compiledEntities.map((entity) => ({
    id: entityRefKey(entity.ref),
    ref: entity.ref,
    type: entity.type,
    sourceId: entity.sourceId,
    status: entity.status,
    title: entity.title,
    aliases: entity.aliases ?? [],
    tags: entity.tags ?? [],
    summary: entity.summary ?? '',
    body: entity.body,
    verseNames: namesForRefs(entity.verseMemberships),
    collectionNames: namesForRefs(entity.collectionMemberships),
  }));

  return {
    schemaVersion: 1,
    sources,
    entities: compiledEntities,
    searchDocuments,
    unresolvedReferences,
    diagnostics,
  };
};

export const entityUrl = (entity: Pick<RawEntity, 'type' | 'id'>): string =>
  `/${entity.type}/${entity.id}`;

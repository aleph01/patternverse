import type { LocalWorkspace, RawEntity } from '@patternverse/workspace';
import {
  assertPersonal,
  assertVerseHome,
  validVerseIds,
  type VerseCatalog,
} from '@patternverse/workspace';
// Compatibility exports for existing UI consumers; policy has one shared implementation.
export {
  assertPersonal,
  assertVerseHome,
  validVerseIds,
  type VerseCatalog,
} from '@patternverse/workspace';

export type PersonalStructure = Extract<RawEntity, { type: 'collection' | 'verse' }>;

export const referencesStructure = (entity: RawEntity, structure: PersonalStructure): boolean =>
  structure.type === 'verse'
    ? entity.type !== 'verse' && (entity.verses ?? []).includes(structure.id)
    : entity.type === 'collection' && entity.items.includes(structure.id);

export const removeStructureReference = (
  entity: RawEntity,
  structure: PersonalStructure,
): RawEntity => {
  if (structure.type === 'verse' && entity.type !== 'verse') {
    const verses = (entity.verses ?? []).filter((id) => id !== structure.id);
    if (!verses.length) throw new Error('Move this item to another verse first.');
    return { ...entity, verses };
  }
  if (structure.type === 'collection' && entity.type === 'collection') {
    return { ...entity, items: entity.items.filter((id) => id !== structure.id) };
  }
  return entity;
};

export const structureDependents = (
  entities: readonly RawEntity[],
  structure: PersonalStructure,
): readonly RawEntity[] =>
  entities.filter((entity) => entity.id !== structure.id && referencesStructure(entity, structure));

export function planStructureDeletion(
  entities: readonly RawEntity[],
  structure: PersonalStructure,
  commons: VerseCatalog,
  destination?: string,
): readonly RawEntity[] {
  assertPersonal(structure);
  const current = entities.find((entity) => entity.id === structure.id);
  if (!current || current.type !== structure.type)
    throw new Error('This item no longer exists. Refresh your workspace.');
  const dependents = structureDependents(entities, structure);
  const remaining = entities.filter((entity) => entity.id !== structure.id);
  if (
    structure.type === 'verse' &&
    dependents.length &&
    (!destination || !validVerseIds(remaining, commons).has(destination))
  ) {
    throw new Error('Choose another verse before deleting this verse.');
  }
  return remaining.map((entity) => {
    if (!referencesStructure(entity, structure)) return entity;
    if (structure.type === 'verse' && entity.type !== 'verse') {
      const updated = {
        ...entity,
        verses: [
          ...new Set([...(entity.verses ?? []).filter((id) => id !== structure.id), destination!]),
        ],
      };
      assertVerseHome(updated, remaining, commons);
      return updated;
    }
    return removeStructureReference(entity, structure);
  });
}

export async function deletePersonalStructure(
  workspace: LocalWorkspace,
  structure: PersonalStructure,
  commons: VerseCatalog,
  destination?: string,
): Promise<void> {
  await workspace.mutateEntities((current) =>
    planStructureDeletion(current, structure, commons, destination),
  );
}

/** Removing a pattern also removes private references, never the public article. */
export async function deletePersonalPattern(workspace: LocalWorkspace, entity: RawEntity) {
  assertPersonal(entity);
  await workspace.mutateEntities((current) =>
    current
      .filter((entry) => entry.id !== entity.id)
      .map((entry) =>
        entry.type === 'collection'
          ? { ...entry, items: entry.items.filter((id) => id !== entity.id) }
          : entry,
      ),
  );
}

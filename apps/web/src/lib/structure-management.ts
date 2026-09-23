import type { LocalWorkspace, RawEntity } from '@patternverse/workspace';

export type PersonalStructure = Extract<RawEntity, { type: 'collection' | 'verse' }>;

export const referencesStructure = (entity: RawEntity, structure: PersonalStructure): boolean => {
  if (structure.type === 'verse') {
    return entity.type !== 'verse' && (entity.verses ?? []).includes(structure.id);
  }
  return entity.type === 'collection' && entity.items.includes(structure.id);
};

export const removeStructureReference = (
  entity: RawEntity,
  structure: PersonalStructure,
): RawEntity => {
  if (structure.type === 'verse' && entity.type !== 'verse') {
    const verses = (entity.verses ?? []).filter((id) => id !== structure.id);
    return { ...entity, verses: verses.length > 0 ? verses : undefined };
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

export const deletePersonalStructure = async (
  workspace: LocalWorkspace,
  entities: readonly RawEntity[],
  structure: PersonalStructure,
): Promise<number> => {
  const dependents = structureDependents(entities, structure);
  for (const dependent of dependents) {
    await workspace.updateEntity(dependent.id, (current) =>
      removeStructureReference(current, structure),
    );
  }
  await workspace.deleteEntity(structure.id);
  return dependents.length;
};

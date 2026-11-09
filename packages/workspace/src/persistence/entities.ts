import type { RawEntity } from '@patternverse/schema';
import { PERSONAL_SOURCE_ID, type LocalWorkspace, type CreatePersonalEntityInput } from '../api.js';
import { libraryRefKey as usefulnessKey } from '../library.js';
import { asPersonalEntity, rawFromStored, storedFromRaw } from './records.js';
import type { PersistenceContext } from './context.js';
export function createEntityOperations(
  context: PersistenceContext,
): Pick<
  LocalWorkspace,
  | 'getEntity'
  | 'listEntities'
  | 'createEntity'
  | 'updateEntity'
  | 'deleteEntity'
  | 'mutateEntities'
  | 'savePatternWithPractices'
> {
  const { database, metadata, now } = context;
  const getEntity = async (id: string): Promise<RawEntity | undefined> => {
    const workspace = await metadata();
    const stored = await database.entities.get(id);
    return stored?.workspaceId === workspace.id ? rawFromStored(stored) : undefined;
  };

  const listEntities = async (): Promise<readonly RawEntity[]> => {
    const workspace = await metadata();
    const stored = await database.entities
      .where('workspaceId')
      .equals(workspace.id)
      .sortBy('updatedAt');
    stored.reverse();
    return stored.map(rawFromStored);
  };

  const createEntity = async (input: CreatePersonalEntityInput): Promise<RawEntity> => {
    const workspace = await metadata();
    const entity = asPersonalEntity({
      ...input,
      sourceId: PERSONAL_SOURCE_ID,
      status: input.status ?? 'draft',
    });
    if (await database.entities.get(entity.id)) {
      throw new Error(`A personal entity with ID "${entity.id}" already exists.`);
    }
    const timestamp = now();
    await database.entities.add(
      storedFromRaw(entity, {
        workspaceId: workspace.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      }),
    );
    return entity;
  };

  const updateEntity = async (
    id: string,
    transform: (current: RawEntity) => RawEntity,
  ): Promise<RawEntity> => {
    const workspace = await metadata();
    return database.transaction('rw', database.entities, async () => {
      const stored = await database.entities.get(id);
      if (!stored || stored.workspaceId !== workspace.id)
        throw new Error(`Personal entity "${id}" does not exist.`);

      const current = rawFromStored(stored);
      const transformed = transform(structuredClone(current));
      if (transformed.id !== id) {
        throw new Error('Entity IDs are stable and cannot be changed during an update.');
      }
      const entity = asPersonalEntity({ ...transformed, sourceId: PERSONAL_SOURCE_ID });
      await database.entities.put(
        storedFromRaw(entity, {
          workspaceId: workspace.id,
          createdAt: stored.createdAt,
          updatedAt: now(),
        }),
      );
      return entity;
    });
  };

  const deleteEntity = async (id: string): Promise<boolean> => {
    const existed = (await getEntity(id)) !== undefined;
    if (existed) await database.entities.delete(id);
    return existed;
  };

  const mutateEntities: LocalWorkspace['mutateEntities'] = async (transform) => {
    const workspace = await metadata();
    return database.transaction(
      'rw',
      database.entities,
      database.favorites,
      database.usefulness,
      async () => {
        const stored = await database.entities.where('workspaceId').equals(workspace.id).toArray();
        const originals = new Map(stored.map((entity) => [entity.id, entity]));
        const next = transform(stored.map(rawFromStored)).map(asPersonalEntity);
        const ids = new Set(next.map((entity) => entity.id));
        if (ids.size !== next.length || next.some((entity) => !originals.has(entity.id))) {
          throw new Error('Workspace changes must preserve existing, unique entity IDs.');
        }
        for (const entity of next) {
          const original = originals.get(entity.id)!;
          if (JSON.stringify(entity) === JSON.stringify(rawFromStored(original))) continue;
          await database.entities.put(
            storedFromRaw(entity, {
              workspaceId: workspace.id,
              createdAt: original.createdAt,
              updatedAt: now(),
            }),
          );
        }
        for (const original of stored) {
          if (ids.has(original.id)) continue;
          await database.entities.delete(original.id);
          const key = usefulnessKey({ sourceId: PERSONAL_SOURCE_ID, entityId: original.id });
          await database.favorites.delete(key);
          await database.usefulness.delete(key);
        }
        return next;
      },
    );
  };

  const savePatternWithPractices: LocalWorkspace['savePatternWithPractices'] = async (input) => {
    const workspace = await metadata();
    return database.transaction('rw', database.entities, async () => {
      const pattern = asPersonalEntity(input.pattern);
      if (pattern.type !== 'pattern') throw new Error('Choose a pattern for these practices.');
      const existingPattern = await database.entities.get(pattern.id);
      if (
        input.create
          ? Boolean(existingPattern)
          : existingPattern?.workspaceId !== workspace.id || existingPattern.type !== 'pattern'
      )
        throw new Error(
          input.create
            ? 'A personal entity with this pattern ID already exists.'
            : 'The personal pattern no longer exists.',
        );
      const originals = new Set(input.originalPracticeIds);
      const practices = input.practices.map(asPersonalEntity);
      const ids = new Set(practices.map((practice) => practice.id));
      if (ids.size !== practices.length || ids.has(pattern.id))
        throw new Error('Every practice needs its own unique ID.');
      const timestamp = now();
      const writes: RawEntity[] = [pattern];
      for (const practice of practices) {
        if (practice.type !== 'practice' || !practice.implements?.includes(pattern.id))
          throw new Error('Every attached practice must implement this pattern.');
        const existing = await database.entities.get(practice.id);
        if (originals.has(practice.id)) {
          const current =
            existing?.workspaceId === workspace.id ? rawFromStored(existing) : undefined;
          if (current?.type !== 'practice' || !current.implements?.includes(pattern.id))
            throw new Error(
              'An attached practice changed or was removed. Reopen the editor before saving.',
            );
        } else if (existing)
          throw new Error('A personal entity with this practice ID already exists.');
        writes.push(practice);
      }
      // Unlink against the current record, preserving other patterns and the practice's history.
      for (const id of originals) {
        if (ids.has(id)) continue;
        const stored = await database.entities.get(id);
        if (!stored || stored.workspaceId !== workspace.id) continue;
        const practice = rawFromStored(stored);
        if (practice.type !== 'practice')
          throw new Error('An attached practice changed type. Reopen the editor before saving.');
        writes.push({
          ...practice,
          implements: practice.implements?.filter((id) => id !== pattern.id),
        });
      }
      for (const entity of writes) {
        const existing = await database.entities.get(entity.id);
        await database.entities.put(
          storedFromRaw(entity, {
            workspaceId: workspace.id,
            createdAt: existing?.createdAt ?? timestamp,
            updatedAt: timestamp,
          }),
        );
      }
      return [pattern, ...practices];
    });
  };

  return {
    getEntity,
    listEntities,
    createEntity,
    updateEntity,
    deleteEntity,
    mutateEntities,
    savePatternWithPractices,
  };
}

import {
  createWorkspaceBackup,
  decodeWorkspaceBackup,
  encodeWorkspaceBackup,
  parseWorkspaceBackup,
} from '../backup.js';
import type { LocalWorkspaceData, PersonalWorkspaceMetadata } from '../ownership.js';
import { conditionalRecordWrites, LocalSyncConflictError } from '../conditional-write.js';
import { libraryRefKey as usefulnessKey } from '../library.js';
import { orderSituations } from '../situations.js';
import type { LocalWorkspace } from '../api.js';
import {
  rawFromStored,
  storedFromRaw,
  favoriteFromStored,
  usefulnessFromStored,
} from './records.js';
import type { PersistenceContext } from './context.js';
import type { createWorkspaceMetadata } from './metadata.js';
export function createWorkspaceTransferOperations(
  context: PersistenceContext,
  cache: Pick<ReturnType<typeof createWorkspaceMetadata>, 'accept' | 'invalidate'>,
): Pick<
  LocalWorkspace,
  'readWorkspaceData' | 'getRecoveryBackup' | 'applySyncData' | 'replaceFromBackup'
> {
  const { database, metadata, now } = context;
  // Used inside both the read transaction and the replacement transaction so the safety
  // snapshot includes the latest writes, not a stale preview taken before confirmation.
  const readData = async (workspace: PersonalWorkspaceMetadata): Promise<LocalWorkspaceData> => {
    const [entities, favorites, usefulness] = await Promise.all([
      database.entities.where('workspaceId').equals(workspace.id).toArray(),
      database.favorites.where('workspaceId').equals(workspace.id).toArray(),
      database.usefulness.where('workspaceId').equals(workspace.id).toArray(),
    ]);
    return {
      workspace: {
        id: workspace.id,
        name: workspace.name,
        kind: workspace.kind,
        visibility: workspace.visibility,
        createdAt: workspace.createdAt,
      },
      entities: entities.map(rawFromStored),
      favorites: favorites.map(favoriteFromStored),
      usefulness: usefulness.map(usefulnessFromStored),
      practiceRuns: await database.practiceRuns.where('workspaceId').equals(workspace.id).toArray(),
      situations: orderSituations(
        await database.situations.where('workspaceId').equals(workspace.id).toArray(),
      ),
    };
  };
  const readWorkspaceData = async (): Promise<LocalWorkspaceData> => {
    const workspace = await metadata();
    return database.transaction(
      'r',
      [
        database.workspaces,
        database.entities,
        database.favorites,
        database.usefulness,
        database.practiceRuns,
        database.situations,
      ],
      async () => {
        const live = await database.workspaces.get(workspace.id);
        if (!live) throw new Error('Workspace not found.');
        return readData(live);
      },
    );
  };
  const getRecoveryBackup: LocalWorkspace['getRecoveryBackup'] = async () => {
    const stored = await database.recoveryBackups.get('before-restore');
    return stored ? decodeWorkspaceBackup(stored.bytes) : undefined;
  };
  const applySyncData: LocalWorkspace['applySyncData'] = async (expectedValue, desiredValue) => {
    const checked = (value: LocalWorkspaceData) => {
      for (const field of [
        'entities',
        'favorites',
        'usefulness',
        'practiceRuns',
        'situations',
      ] as const)
        if (!Array.isArray(value[field])) throw new Error(`Sync data is missing ${field}.`);
      const backup = parseWorkspaceBackup(createWorkspaceBackup(value, now()));
      encodeWorkspaceBackup(backup);
      return backup;
    };
    const expected = checked(expectedValue),
      desired = checked(desiredValue);
    const local = await metadata();
    for (const data of [expected, desired]) {
      if (data.workspace.id !== local.id || data.workspace.createdAt !== local.createdAt)
        throw new Error('Sync cannot replace this device’s workspace identity.');
    }
    await database.transaction(
      'rw',
      [
        database.workspaces,
        database.entities,
        database.favorites,
        database.usefulness,
        database.practiceRuns,
        database.situations,
      ],
      async () => {
        const live = await database.workspaces.get(local.id);
        if (!live) throw new Error('Workspace not found.');
        const current = await readData(live);
        const entities = conditionalRecordWrites(
          expected.entities,
          desired.entities,
          current.entities,
          (row) => row.id,
        );
        const favorites = conditionalRecordWrites(
          expected.favorites,
          desired.favorites,
          current.favorites,
          (row) => usefulnessKey(row.ref),
        );
        const ratings = conditionalRecordWrites(
          expected.usefulness,
          desired.usefulness,
          current.usefulness,
          (row) => usefulnessKey(row.ref),
        );
        const runs = conditionalRecordWrites(
          expected.practiceRuns,
          desired.practiceRuns,
          current.practiceRuns,
          (row) => row.id,
        );
        const situations = conditionalRecordWrites(
          expected.situations,
          desired.situations,
          current.situations,
          (row) => row.id,
        );
        if (
          expected.workspace.name !== desired.workspace.name &&
          live.name !== desired.workspace.name &&
          live.name !== expected.workspace.name
        )
          throw new LocalSyncConflictError();
        const timestamp = now();
        for (const write of entities) {
          if (!write.after) await database.entities.delete(write.key);
          else {
            const existing = write.before ? await database.entities.get(write.key) : undefined;
            const stored = storedFromRaw(write.after, {
              workspaceId: live.id,
              createdAt: existing?.createdAt ?? timestamp,
              updatedAt: timestamp,
            });
            if (write.before) await database.entities.put(stored);
            else await database.entities.add(stored);
          }
        }
        for (const write of favorites) {
          if (!write.after) await database.favorites.delete(write.key);
          else {
            const stored = { ...write.after, refKey: write.key };
            if (write.before) await database.favorites.put(stored);
            else await database.favorites.add(stored);
          }
        }
        for (const write of ratings) {
          if (!write.after) await database.usefulness.delete(write.key);
          else {
            const stored = {
              workspaceId: live.id,
              refKey: write.key,
              sourceId: write.after.ref.sourceId,
              entityId: write.after.ref.entityId,
              usefulness: write.after.usefulness,
              updatedAt: write.after.updatedAt,
            };
            if (write.before) await database.usefulness.put(stored);
            else await database.usefulness.add(stored);
          }
        }
        for (const write of runs) {
          if (!write.after) await database.practiceRuns.delete(write.key);
          else if (write.before) await database.practiceRuns.put(write.after);
          else await database.practiceRuns.add(write.after);
        }
        for (const write of situations) {
          if (!write.after) await database.situations.delete(write.key);
          else if (write.before) await database.situations.put(write.after);
          else await database.situations.add(write.after);
        }
        if (expected.workspace.name !== desired.workspace.name)
          await database.workspaces.update(live.id, { name: desired.workspace.name });
      },
    );
    // Other tabs can rename the workspace; don't cache a stale metadata copy after CAS.
    cache.invalidate();
  };
  const replaceFromBackup: LocalWorkspace['replaceFromBackup'] = async (candidate) => {
    // Revalidate even if the UI has already previewed this file. No DB writes on invalid input.
    const backup = parseWorkspaceBackup(candidate);
    encodeWorkspaceBackup(backup); // Apply the same size cap to callers outside the file picker.
    const current = await metadata();
    const restored = await database.transaction(
      'rw',
      [
        database.workspaces,
        database.entities,
        database.favorites,
        database.usefulness,
        database.practiceRuns,
        database.situations,
        database.recoveryBackups,
      ],
      async () => {
        const live = await database.workspaces.get(current.id);
        if (!live) throw new Error('Workspace not found.');
        const timestamp = now();
        const safety = encodeWorkspaceBackup(
          createWorkspaceBackup(await readData(live), timestamp),
        );
        await database.recoveryBackups.put({ key: 'before-restore', bytes: safety });
        // Clear only this private workspace. bulkAdd makes collisions with unrelated rows
        // fail (and roll back), rather than silently overwriting them.
        await database.entities.where('workspaceId').equals(live.id).delete();
        await database.favorites.where('workspaceId').equals(live.id).delete();
        await database.usefulness.where('workspaceId').equals(live.id).delete();
        await database.practiceRuns.where('workspaceId').equals(live.id).delete();
        await database.situations.where('workspaceId').equals(live.id).delete();
        await database.entities.bulkAdd(
          backup.entities.map((entity) =>
            storedFromRaw(entity, {
              workspaceId: live.id,
              createdAt: timestamp,
              updatedAt: timestamp,
            }),
          ),
        );
        await database.favorites.bulkAdd(
          backup.favorites.map((favorite) => ({
            ...favorite,
            workspaceId: live.id,
            refKey: usefulnessKey(favorite.ref),
          })),
        );
        await database.usefulness.bulkAdd(
          backup.usefulness.map((rating) => ({
            workspaceId: live.id,
            refKey: usefulnessKey(rating.ref),
            sourceId: rating.ref.sourceId,
            entityId: rating.ref.entityId,
            usefulness: rating.usefulness,
            updatedAt: rating.updatedAt,
          })),
        );
        await database.practiceRuns.bulkAdd(
          backup.practiceRuns.map((run) => ({ ...run, workspaceId: live.id })),
        );
        await database.situations.bulkAdd(
          backup.situations.map((situation) => ({ ...situation, workspaceId: live.id })),
        );
        await database.workspaces.update(live.id, { name: backup.workspace.name });
        // A portable file must not take over this device's local actor or workspace identity.
        return { ...current, name: backup.workspace.name };
      },
    );
    cache.accept(restored);
  };

  return { readWorkspaceData, getRecoveryBackup, applySyncData, replaceFromBackup };
}

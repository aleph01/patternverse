import { Dexie } from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createIndexedDbWorkspace,
  DEFAULT_WORKSPACE_DATABASE,
  PERSONAL_SOURCE_ID,
  type LocalWorkspace,
  type PracticeRunInput,
} from '../src/index.js';
import { createWorkspaceBackup, encodeWorkspaceBackup } from '../src/backup.js';

const timestamp = '2026-10-10T10:00:00.000Z';
const ref = { sourceId: 'commons', entityId: 'reflection' };
const run: PracticeRunInput = {
  id: 'reflection-run',
  patternRef: ref,
  patternType: 'pattern',
  patternTitle: 'Reflection',
  title: 'Private reflection',
  verseIds: ['learning'],
  origin: 'patternverse',
  status: 'in-progress',
  revision: 1,
  checkpoint: '{"opaque":"checkpoint"}',
  responses: [{ id: 'answer', prompt: 'What helps?', answer: 'A small step 🌿' }],
};
const opened: { close: () => void }[] = [];
function dependencies() {
  return { indexedDB: new IDBFactory(), IDBKeyRange, databaseName: crypto.randomUUID() };
}
function local(options = dependencies()) {
  const workspace = createIndexedDbWorkspace({
    ...options,
    now: () => new Date(timestamp),
  });
  opened.push(workspace);
  return workspace;
}
async function inspect(options: ReturnType<typeof dependencies>) {
  const database = new Dexie(options.databaseName, options);
  opened.push(database);
  await database.open();
  return database;
}
async function populate(workspace: LocalWorkspace) {
  await workspace.renameWorkspace('Private workspace');
  await workspace.createEntity({
    id: 'reflection',
    type: 'pattern',
    title: 'Reflection',
    body: '# An unchanged article\n\nUnicode café 🌿 and whitespace.  \n',
    verses: ['learning'],
  });
  await workspace.setSavedEntry(ref, true);
  await workspace.setUsefulness(ref, 2);
  await workspace.savePracticeRun(run);
  await workspace.createSituation('A private notebook');
  return workspace.readWorkspaceData();
}
afterEach(() => {
  opened.splice(0).forEach((connection) => connection.close());
});

describe('persistence composition compatibility', () => {
  it('keeps the complete public API, database name and saved-entry aliases', async () => {
    const workspace = local();
    expect(DEFAULT_WORKSPACE_DATABASE).toBe('patternverse-workspace-v1');
    expect(PERSONAL_SOURCE_ID).toBe('personal');
    expect(Object.keys(workspace).sort()).toEqual(
      [
        'applySyncData',
        'close',
        'createEntity',
        'createSituation',
        'deleteEntity',
        'deletePracticeRun',
        'getEntity',
        'getFavorite',
        'getPracticeRun',
        'getRecoveryBackup',
        'getSavedEntry',
        'getUsefulness',
        'getWorkspace',
        'listEntities',
        'listFavorites',
        'listPracticeRuns',
        'listSavedEntries',
        'listSituations',
        'listUsefulness',
        'moveSituation',
        'mutateEntities',
        'readWorkspaceData',
        'renamePracticeRun',
        'renameWorkspace',
        'replaceFromBackup',
        'savePracticeRun',
        'setFavorite',
        'setSavedEntry',
        'setUsefulness',
        'updateEntity',
        'updateSituation',
      ].sort(),
    );
    expect(workspace.listSavedEntries).toBe(workspace.listFavorites);
    expect(workspace.getSavedEntry).toBe(workspace.getFavorite);
    expect(workspace.setSavedEntry).toBe(workspace.setFavorite);
    await workspace.setFavorite(ref, true);
    expect(await workspace.getSavedEntry(ref)).toMatchObject({ ref });
  });

  it.each([2, 3, 4, 5])(
    'opens a version %s database without rewriting existing records',
    async (version) => {
      const options = dependencies();
      const legacy = new Dexie(options.databaseName, options);
      opened.push(legacy);
      legacy.version(2).stores({
        entities: 'id, workspaceId, type, status, updatedAt',
        usefulness: 'refKey, workspaceId, sourceId, entityId, updatedAt',
        workspaces: 'id, &localKey',
        favorites: 'refKey, workspaceId, createdAt',
      });
      if (version >= 3)
        legacy.version(3).stores({ practiceRuns: 'id, workspaceId, updatedAt, status' });
      if (version >= 4) legacy.version(4).stores({ recoveryBackups: 'key' });
      if (version >= 5) legacy.version(5).stores({ situations: 'id, workspaceId, position' });
      const metadata = {
        id: 'existing-workspace',
        name: 'Existing name',
        kind: 'personal' as const,
        visibility: 'private' as const,
        owner: { kind: 'local' as const, actorId: 'existing-actor' },
        createdAt: '2026-08-01T12:00:00.000Z',
      };
      const entity = {
        id: 'reflection',
        sourceId: 'personal',
        type: 'pattern',
        title: 'Original title',
        body: '# Original café 🌿\n\n!ask answer {\n  What helps?\n}\n',
        status: 'deprecated',
        verses: ['learning'],
        workspaceId: metadata.id,
        createdAt: '2026-08-02T12:00:00.000Z',
        updatedAt: '2026-08-03T12:00:00.000Z',
      };
      const favorite = {
        refKey: 'commons:reflection',
        workspaceId: metadata.id,
        ref,
        createdAt: metadata.createdAt,
      };
      const rating = {
        refKey: favorite.refKey,
        workspaceId: metadata.id,
        ...ref,
        usefulness: 2,
        updatedAt: metadata.createdAt,
      };
      const savedRun = {
        ...run,
        workspaceId: metadata.id,
        createdAt: metadata.createdAt,
        updatedAt: metadata.createdAt,
      };
      const situation = {
        id: 'notebook',
        workspaceId: metadata.id,
        title: 'Original notebook',
        context: 'Keep private context.',
        position: 3,
        revision: 7,
        createdAt: metadata.createdAt,
        updatedAt: metadata.createdAt,
      };
      const recovery = {
        key: 'before-restore',
        bytes: encodeWorkspaceBackup(
          createWorkspaceBackup(
            {
              workspace: metadata,
              entities: [],
              favorites: [],
              usefulness: [],
              practiceRuns: [],
              situations: [],
            },
            timestamp,
          ),
        ),
      };
      await legacy
        .table('workspaces')
        .add({ ...metadata, localKey: 'personal', deviceSecret: 'never-export' });
      await legacy.table('entities').add(entity);
      await legacy.table('favorites').add(favorite);
      await legacy.table('usefulness').add(rating);
      if (version >= 3) await legacy.table('practiceRuns').add(savedRun);
      if (version >= 4) await legacy.table('recoveryBackups').add(recovery);
      if (version >= 5) await legacy.table('situations').add(situation);
      legacy.close();

      const workspace = local(options);
      expect(await workspace.getWorkspace()).toEqual(metadata);
      const snapshot = await workspace.readWorkspaceData();
      expect(snapshot.entities).toEqual([
        {
          id: entity.id,
          sourceId: entity.sourceId,
          type: entity.type,
          title: entity.title,
          body: entity.body,
          status: entity.status,
          verses: entity.verses,
        },
      ]);
      expect(snapshot.practiceRuns).toEqual(version >= 3 ? [savedRun] : []);
      expect(snapshot.situations).toEqual(version >= 5 ? [situation] : []);
      expect(snapshot.workspace).not.toHaveProperty('owner');
      expect(JSON.stringify(snapshot)).not.toContain('never-export');
      const database = await inspect(options);
      expect(database.verno).toBe(5);
      expect(database.tables.map((table) => table.name).sort()).toEqual([
        'entities',
        'favorites',
        'practiceRuns',
        'recoveryBackups',
        'situations',
        'usefulness',
        'workspaces',
      ]);
      expect(await database.table('entities').get(entity.id)).toEqual(entity);
      expect(await database.table('favorites').get(favorite.refKey)).toEqual(favorite);
      expect(await database.table('usefulness').get(rating.refKey)).toEqual(rating);
      if (version >= 4)
        expect(await database.table('recoveryBackups').get(recovery.key)).toEqual(recovery);
      else expect(await workspace.getRecoveryBackup()).toBeUndefined();
    },
  );

  it('shares one identity and clock across all operation groups and survives reopening', async () => {
    const options = dependencies();
    const workspace = local(options);
    const before = await workspace.getWorkspace();
    Object.assign(before, { name: 'Caller-only change' });
    Object.assign(before.owner, { actorId: 'Caller-only actor' });
    expect((await workspace.getWorkspace()).name).toBe('My Workspace');
    expect((await workspace.getWorkspace()).owner.actorId).not.toBe('Caller-only actor');
    const snapshot = await populate(workspace);
    const database = await inspect(options);
    for (const table of ['entities', 'favorites', 'usefulness', 'practiceRuns', 'situations']) {
      const rows = await database.table(table).toArray();
      expect(rows).toHaveLength(1);
      expect(rows[0].workspaceId).toBe(snapshot.workspace.id);
      expect(rows[0].updatedAt ?? rows[0].createdAt).toBe(timestamp);
    }
    workspace.close();
    const reopened = local(options);
    expect(await reopened.readWorkspaceData()).toEqual(snapshot);
    expect(await reopened.getSavedEntry(ref)).toMatchObject({ ref });
    expect(await reopened.getPracticeRun(run.id)).toMatchObject({ responses: run.responses });
  });

  it('invalidates the shared metadata cache only after a successful sync transaction', async () => {
    const options = dependencies();
    const first = local(options),
      second = local(options);
    const expected = await populate(first);
    const identity = await first.getWorkspace();
    await second.renameWorkspace('Rename from another connection');
    expect((await first.getWorkspace()).name).toBe(identity.name);
    await first.applySyncData(expected, expected);
    expect(await first.getWorkspace()).toEqual({
      ...identity,
      name: 'Rename from another connection',
    });
    expect((await first.readWorkspaceData()).workspace.name).toBe('Rename from another connection');
  });
});

describe('cross-table transaction boundaries', () => {
  it.each(['practiceRuns', 'situations'] as const)(
    'rolls back restore and its recovery copy after a late %s collision',
    async (table) => {
      const source = local();
      const backup = createWorkspaceBackup(await populate(source), timestamp);
      const options = dependencies();
      const target = local(options);
      await populate(target);
      await target.replaceFromBackup(
        createWorkspaceBackup(await target.readWorkspaceData(), timestamp),
      );
      await target.renameWorkspace('Keep local name');
      const before = await target.readWorkspaceData();
      const recoveryBefore = await target.getRecoveryBackup();
      const identity = await target.getWorkspace();
      const foreign = { ...backup[table][0]!, workspaceId: 'unrelated-workspace' };
      const database = await inspect(options);
      if (table === 'practiceRuns') await database.table(table).delete(foreign.id);
      await database.table(table).add(foreign);
      const live = await target.readWorkspaceData();
      await expect(target.replaceFromBackup(backup)).rejects.toThrow();
      expect(await target.readWorkspaceData()).toEqual(live);
      expect(await target.getRecoveryBackup()).toEqual(recoveryBefore);
      expect(await target.getWorkspace()).toEqual(identity);
      expect(await database.table(table).get(foreign.id)).toEqual(foreign);
      expect((await target.readWorkspaceData()).entities).toEqual(before.entities);
    },
  );

  it.each(['favorites', 'usefulness', 'practiceRuns', 'situations'] as const)(
    'rolls back earlier sync writes after a late %s collision',
    async (table) => {
      const options = dependencies();
      const target = local(options);
      const expected = await populate(target);
      const desired = {
        ...expected,
        workspace: { ...expected.workspace, name: 'Remote name' },
        entities: expected.entities.map((entity) => ({ ...entity, title: 'Remote title' })),
        favorites: [...expected.favorites],
        usefulness: [...expected.usefulness],
        practiceRuns: [...expected.practiceRuns],
        situations: [...expected.situations],
      };
      const id = 'foreign-collision';
      const key = `commons:${id}`;
      const database = await inspect(options);
      if (table === 'favorites') {
        const next = { ...expected.favorites[0]!, ref: { ...ref, entityId: id } };
        desired.favorites.push(next);
        await database
          .table(table)
          .add({ ...next, refKey: key, workspaceId: 'unrelated-workspace' });
      } else if (table === 'usefulness') {
        const next = { ...expected.usefulness[0]!, ref: { ...ref, entityId: id } };
        desired.usefulness.push(next);
        await database.table(table).add({
          workspaceId: 'unrelated-workspace',
          refKey: key,
          ...next.ref,
          usefulness: next.usefulness,
          updatedAt: next.updatedAt,
        });
      } else if (table === 'practiceRuns') {
        const next = { ...expected.practiceRuns[0]!, id };
        desired.practiceRuns.push(next);
        await database.table(table).add({ ...next, workspaceId: 'unrelated-workspace' });
      } else {
        const next = { ...expected.situations[0]!, id, position: 1 };
        desired.situations.push(next);
        await database.table(table).add({ ...next, workspaceId: 'unrelated-workspace' });
      }
      const foreign = await database
        .table(table)
        .get(table === 'favorites' || table === 'usefulness' ? key : id);
      await expect(target.applySyncData(expected, desired)).rejects.toThrow();
      expect(await target.readWorkspaceData()).toEqual(expected);
      expect((await target.getWorkspace()).name).toBe(expected.workspace.name);
      expect(await target.getRecoveryBackup()).toBeUndefined();
      expect(
        await database.table(table).get(table === 'favorites' || table === 'usefulness' ? key : id),
      ).toEqual(foreign);
    },
  );
});

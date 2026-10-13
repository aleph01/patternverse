import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { afterEach, describe, expect, it } from 'vitest';
import {
  createIndexedDbWorkspace,
  LocalSyncConflictError,
  canonicalRecord,
  type LocalWorkspace,
} from '../src/index.js';

const stores: LocalWorkspace[] = [];
function local(indexedDB = new IDBFactory(), databaseName = crypto.randomUUID()) {
  const store = createIndexedDbWorkspace({ indexedDB, IDBKeyRange, databaseName });
  stores.push(store);
  return store;
}
async function populated(workspace: LocalWorkspace) {
  await workspace.createEntity({ id: 'one', type: 'pattern', title: 'One', body: 'Original' });
  await workspace.createEntity({ id: 'two', type: 'pattern', title: 'Two', body: 'Keep' });
  await workspace.setSavedEntry({ sourceId: 'commons', entityId: 'one' }, true);
  await workspace.setUsefulness({ sourceId: 'commons', entityId: 'one' }, 1);
  await workspace.savePracticeRun({
    id: 'run',
    patternRef: { sourceId: 'commons', entityId: 'one' },
    patternTitle: 'One',
    patternType: 'pattern',
    title: 'Private response',
    origin: 'patternverse',
    status: 'in-progress',
    revision: 0,
    verseIds: [],
    responses: [{ id: 'answer', prompt: 'What?', answer: 'Private' }],
  });
  await workspace.createSituation('A situation');
  return workspace.readWorkspaceData();
}
afterEach(() => {
  for (const store of stores.splice(0)) store.close();
});

describe('workspace sync compare-and-swap', () => {
  it('atomically applies all workspace sections and replays idempotently without invoking restore', async () => {
    const indexedDB = new IDBFactory(),
      name = crypto.randomUUID();
    const workspace = local(indexedDB, name);
    const identity = await workspace.getWorkspace();
    const expected = await populated(workspace);
    const desired = {
      ...expected,
      workspace: { ...expected.workspace, name: 'Synced name' },
      entities: [{ ...expected.entities[0]!, title: 'Remote' }],
      favorites: [],
      usefulness: [{ ...expected.usefulness[0]!, usefulness: 2 as const }],
      practiceRuns: [
        {
          ...expected.practiceRuns[0]!,
          responses: [{ id: 'answer', prompt: 'What?', answer: 'Updated' }],
        },
      ],
      situations: [{ ...expected.situations[0]!, context: 'Remote context' }],
    };
    await workspace.applySyncData(expected, desired);
    expect(canonicalRecord(await workspace.readWorkspaceData())).toBe(canonicalRecord(desired));
    const reopened = local(indexedDB, name);
    await reopened.applySyncData(expected, desired);
    expect(canonicalRecord(await reopened.readWorkspaceData())).toBe(canonicalRecord(desired));
    expect(await reopened.getWorkspace()).toEqual({ ...identity, name: 'Synced name' });
    expect(await reopened.getRecoveryBackup()).toBeUndefined();
  });

  it('preserves unrelated local records and edits, including a concurrent rename', async () => {
    const workspace = local();
    const expected = await populated(workspace);
    const desired = {
      ...expected,
      entities: expected.entities.map((row) =>
        row.id === 'one' ? { ...row, title: 'Remote one' } : row,
      ),
    };
    await workspace.updateEntity('two', (row) => ({ ...row, title: 'Local two' }));
    await workspace.createEntity({
      id: 'new',
      type: 'pattern',
      title: 'New local',
      body: 'Keep me',
    });
    await workspace.renameWorkspace('Local rename');
    await workspace.applySyncData(expected, desired);
    expect(
      (await workspace.listEntities())
        .map((row) => [row.id, row.title])
        .sort(([a], [b]) => a!.localeCompare(b!)),
    ).toEqual([
      ['new', 'New local'],
      ['one', 'Remote one'],
      ['two', 'Local two'],
    ]);
    expect((await workspace.getWorkspace()).name).toBe('Local rename');
  });

  it('rolls back the whole batch if any target changed locally', async () => {
    const workspace = local();
    const expected = await populated(workspace);
    const desired = {
      ...expected,
      entities: expected.entities.map((row) => ({ ...row, title: 'Remote' })),
      usefulness: [{ ...expected.usefulness[0]!, usefulness: 2 as const }],
      favorites: [],
    };
    await workspace.setUsefulness({ sourceId: 'commons', entityId: 'one' }, 0);
    const live = await workspace.readWorkspaceData();
    await expect(workspace.applySyncData(expected, desired)).rejects.toBeInstanceOf(
      LocalSyncConflictError,
    );
    expect(await workspace.readWorkspaceData()).toEqual(live);
  });

  it('does not overwrite a target edited after a partially completed cross-database sync', async () => {
    const workspace = local();
    const expected = await populated(workspace);
    const desired = {
      ...expected,
      entities: expected.entities.map((row) =>
        row.id === 'one' ? { ...row, title: 'Remote' } : row,
      ),
    };
    await workspace.applySyncData(expected, desired);
    await workspace.updateEntity('one', (row) => ({ ...row, title: 'Later local edit' }));
    await expect(workspace.applySyncData(expected, desired)).rejects.toBeInstanceOf(
      LocalSyncConflictError,
    );
    expect((await workspace.getEntity('one'))?.title).toBe('Later local edit');
  });

  it('rejects foreign ownership, incomplete input and invalid content before applying', async () => {
    const workspace = local();
    const expected = await populated(workspace);
    for (const desired of [
      { ...expected, workspace: { ...expected.workspace, id: 'foreign' } },
      { ...expected, situations: undefined },
      { ...expected, entities: [{ ...expected.entities[0]!, sourceId: 'commons' }] },
      { ...expected, workspace: { ...expected.workspace, createdAt: '2000-01-01T00:00:00.000Z' } },
    ])
      await expect(workspace.applySyncData(expected, desired as typeof expected)).rejects.toThrow();
    expect(await workspace.readWorkspaceData()).toEqual(expected);
  });

  it('treats table order as incidental but keeps collection item order meaningful', async () => {
    const workspace = local();
    await populated(workspace);
    await workspace.createEntity({
      id: 'collection',
      type: 'collection',
      title: 'Collection',
      body: '',
      items: ['one', 'two'],
    });
    const expected = await workspace.readWorkspaceData();
    const desired = {
      ...expected,
      entities: [...expected.entities]
        .reverse()
        .map((row) => (row.type === 'collection' ? { ...row, items: ['two', 'one'] } : row)),
    };
    await workspace.applySyncData(expected, desired);
    expect(await workspace.getEntity('collection')).toMatchObject({ items: ['two', 'one'] });
    await workspace.applySyncData(expected, desired);
  });
});

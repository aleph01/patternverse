import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { createIndexedDbWorkspace, parseSituation, type SituationPriority } from '../src/index.js';
import {
  createWorkspaceBackup,
  decodeWorkspaceBackup,
  encodeWorkspaceBackup,
} from '../src/backup.js';

const storage = () => ({
  indexedDB: new IDBFactory(),
  IDBKeyRange,
  databaseName: crypto.randomUUID(),
});

it('preserves priority through older editors, backups, sync, and reopening, and explicitly clears it', async () => {
  const options = storage(),
    workspace = createIndexedDbWorkspace(options),
    restored = createIndexedDbWorkspace(storage());
  try {
    const original = await workspace.createSituation('A decision');
    expect(original).not.toHaveProperty('priority');
    expect(parseSituation(original)).not.toHaveProperty('priority');
    const important = await workspace.updateSituation(
      original.id,
      { title: original.title, context: '', priority: 5 },
      original.revision,
    );
    const renamed = await workspace.updateSituation(
      important.id,
      { title: 'Renamed decision', context: 'Keep my context' },
      important.revision,
    );
    expect(renamed.priority).toBe(5);
    const backup = decodeWorkspaceBackup(
      encodeWorkspaceBackup(createWorkspaceBackup(await workspace.readWorkspaceData())),
    );
    await restored.replaceFromBackup(backup);
    expect((await restored.listSituations())[0]).toMatchObject({
      title: renamed.title,
      context: renamed.context,
      priority: 5,
    });

    const expected = await workspace.readWorkspaceData();
    await workspace.applySyncData(expected, {
      ...expected,
      situations: [{ ...renamed, priority: 2, revision: renamed.revision + 1 }],
    });
    const synced = (await workspace.listSituations())[0]!;
    expect(synced.priority).toBe(2);
    await expect(
      workspace.updateSituation(
        renamed.id,
        { title: 'Stale rename', context: '', priority: 1 },
        renamed.revision,
      ),
    ).rejects.toThrow('another window');
    expect((await workspace.listSituations())[0]!.priority).toBe(2);
    const cleared = await workspace.updateSituation(
      synced.id,
      { title: synced.title, context: synced.context, priority: null },
      synced.revision,
    );
    expect(cleared).not.toHaveProperty('priority');
    workspace.close();
    const reopened = createIndexedDbWorkspace(options);
    try {
      expect((await reopened.listSituations())[0]).not.toHaveProperty('priority');
    } finally {
      reopened.close();
    }
  } finally {
    workspace.close();
    restored.close();
  }
});

it('rejects invalid priorities in writes and imported situations without changing the saved record', async () => {
  const workspace = createIndexedDbWorkspace(storage());
  try {
    const situation = await workspace.createSituation('A situation');
    for (const priority of [0, 6, -1, 2.5, '5', NaN, Infinity]) {
      expect(() => parseSituation({ ...situation, priority })).toThrow('priority');
      await expect(
        workspace.updateSituation(
          situation.id,
          { title: situation.title, context: '', priority: priority as SituationPriority },
          situation.revision,
        ),
      ).rejects.toThrow('priority');
    }
    expect(await workspace.listSituations()).toEqual([situation]);
  } finally {
    workspace.close();
  }
});

it('creates a linked subproblem and its dragged position atomically and rejects invalid or stale requests', async () => {
  const workspace = createIndexedDbWorkspace(storage());
  try {
    const parent = await workspace.createSituation('Parent');
    await expect(
      workspace.createSituation('Invalid placement', parent, { x: -1, y: 200 }),
    ).rejects.toThrow();
    expect(await workspace.listSituations()).toHaveLength(1);
    const child = await workspace.createSituation('Child', parent, { x: 321.5, y: 450 });
    expect(child).toMatchObject({
      mapPosition: { x: 321.5, y: 450 },
      connections: [{ targetId: parent.id, kind: 'part-of' }],
    });
    await workspace.updateSituation(
      parent.id,
      { title: 'Renamed parent', context: '' },
      parent.revision,
    );
    await expect(workspace.createSituation('Stale child', parent, { x: 1, y: 2 })).rejects.toThrow(
      'another window',
    );
    expect(await workspace.listSituations()).toHaveLength(2);
  } finally {
    workspace.close();
  }
});

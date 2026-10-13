import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { createIndexedDbWorkspace } from '../src/index.js';
import {
  createWorkspaceBackup,
  decodeWorkspaceBackup,
  encodeWorkspaceBackup,
  parseWorkspaceBackup,
} from '../src/backup.js';

const storage = () => ({
  indexedDB: new IDBFactory(),
  IDBKeyRange,
  databaseName: crypto.randomUUID(),
});
it('persists ordered situations and context, appends concurrent additions, and rejects stale notebook writes', async () => {
  const options = storage();
  const a = createIndexedDbWorkspace(options),
    b = createIndexedDbWorkspace(options);
  const [first, second] = await Promise.all([
    a.createSituation('Creative work'),
    b.createSituation('A difficult conversation'),
  ]);
  expect((await a.listSituations()).map((s) => s.position)).toEqual([0, 1]);
  const original = await a.listSituations();
  await b.moveSituation(original[1]!.id, original[0]!.id);
  const updated = await a.updateSituation(
    first.id,
    { title: 'Starting creative work', context: 'I want a gentler beginning.' },
    first.revision,
  );
  expect((await a.listSituations())[0]!.id).toBe(original[1]!.id);
  await expect(
    b.updateSituation(first.id, { title: first.title, context: 'Stale draft' }, first.revision),
  ).rejects.toThrow('another window');
  a.close();
  b.close();
  const reopened = createIndexedDbWorkspace(options);
  expect((await reopened.listSituations()).find((s) => s.id === first.id)).toMatchObject(updated);
  expect((await reopened.listSituations()).find((s) => s.id === second.id)).toBeTruthy();
  await expect(reopened.moveSituation(first.id, 'missing')).rejects.toThrow('queue changed');
  reopened.close();
});
it('round-trips context and ordering through backup, restores ownership, and accepts older backups', async () => {
  const source = createIndexedDbWorkspace(storage()),
    target = createIndexedDbWorkspace(storage());
  const first = await source.createSituation('Creative work');
  const second = await source.createSituation('Conversations');
  await source.updateSituation(first.id, { title: first.title, context: 'Private context 🌿' }, 0);
  await source.moveSituation(second.id, first.id);
  const backup = decodeWorkspaceBackup(
    encodeWorkspaceBackup(createWorkspaceBackup(await source.readWorkspaceData())),
  );
  await target.createSituation('Old queue');
  const targetId = (await target.getWorkspace()).id;
  await target.replaceFromBackup(backup);
  expect((await target.listSituations()).map((s) => s.id)).toEqual([second.id, first.id]);
  expect((await target.listSituations())[1]).toMatchObject({
    context: 'Private context 🌿',
    workspaceId: targetId,
  });
  expect((await target.getRecoveryBackup())!.situations[0]!.title).toBe('Old queue');
  const { situations: ignored, ...legacy } = backup;
  expect(ignored).toHaveLength(2);
  expect(parseWorkspaceBackup(legacy).situations).toEqual([]);
  for (const situations of [
    null,
    [...backup.situations, backup.situations[0]],
    [{ ...backup.situations[0], workspaceId: 'other' }],
  ]) {
    await expect(
      target.replaceFromBackup({ ...backup, situations } as typeof backup),
    ).rejects.toThrow();
  }
  expect(await target.listSituations()).toHaveLength(2);
  source.close();
  target.close();
});

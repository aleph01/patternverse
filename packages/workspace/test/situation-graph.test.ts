import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import {
  createIndexedDbWorkspace,
  emptyBearingsNotebook,
  situationConnections,
  validateSituationGraph,
  parseMapPosition,
  parseSituation,
  type SituationConnection,
} from '../src/index.js';
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

it('persists shared subproblems, positions and notebooks through reopening and workspace backups', async () => {
  const options = storage(),
    workspace = createIndexedDbWorkspace(options);
  const parent = await workspace.createSituation('Conversation'),
    other = await workspace.createSituation('At work');
  const child = await workspace.createSituation('Fear of reaction', parent);
  const connection: SituationConnection = {
    sourceId: child.id,
    targetId: other.id,
    kind: 'part-of',
  };
  await workspace.changeSituationConnection({
    previous: null,
    next: connection,
    expected: [child, other],
  });
  let current = (await workspace.listSituations()).find((s) => s.id === child.id)!;
  const notebook = { ...emptyBearingsNotebook(), draft: 'A private thought' };
  current = await workspace.updateSituation(
    child.id,
    { title: child.title, context: 'Context', notebook },
    current.revision,
  );
  current = await workspace.positionSituationOnMap(child.id, { x: 325, y: 245 }, current.revision);
  expect(current.connections).toHaveLength(2);
  const backup = decodeWorkspaceBackup(
    encodeWorkspaceBackup(createWorkspaceBackup(await workspace.readWorkspaceData())),
  );
  const restored = createIndexedDbWorkspace(storage());
  await restored.replaceFromBackup(backup);
  expect((await restored.listSituations()).find((s) => s.id === child.id)).toMatchObject({
    notebook,
    mapPosition: { x: 325, y: 245 },
    connections: current.connections,
  });
  workspace.close();
  const reopened = createIndexedDbWorkspace(options);
  expect((await reopened.listSituations()).find((s) => s.id === child.id)).toMatchObject({
    notebook,
    mapPosition: { x: 325, y: 245 },
  });
  reopened.close();
  restored.close();
});
it('changes and removes a connection atomically, checks revisions, and leaves notebooks intact', async () => {
  const options = storage(),
    a = createIndexedDbWorkspace(options),
    b = createIndexedDbWorkspace(options);
  const parent = await a.createSituation('Parent'),
    child = await a.createSituation('Child', parent),
    other = await a.createSituation('Other');
  const previous: SituationConnection = {
    sourceId: child.id,
    targetId: parent.id,
    kind: 'part-of',
  };
  const notebook = { ...emptyBearingsNotebook(), draft: 'Keep me' };
  const saved = await b.updateSituation(
    child.id,
    { title: child.title, context: 'Newest context', notebook },
    child.revision,
  );
  await expect(
    a.changeSituationConnection({
      previous,
      next: { sourceId: child.id, targetId: other.id, kind: 'related' },
      expected: [child, parent, other],
    }),
  ).rejects.toThrow('another window');
  expect(situationConnections(await a.listSituations())).toEqual([previous]);
  const next: SituationConnection = { sourceId: child.id, targetId: other.id, kind: 'part-of' };
  const changed = await a.changeSituationConnection({
    previous,
    next,
    expected: [saved, parent, other],
  });
  expect(situationConnections(changed)).toEqual([next]);
  await a.changeSituationConnection({ previous: next, next: null, expected: changed });
  expect((await a.listSituations()).find((s) => s.id === child.id)).toMatchObject({
    notebook,
    context: 'Newest context',
    connections: [],
  });
  await expect(a.positionSituationOnMap(child.id, { x: 1, y: 2 }, saved.revision)).rejects.toThrow(
    'another window',
  );
  a.close();
  b.close();
});
it('rejects self links, duplicates, missing targets and containment cycles but allows related networks', async () => {
  const w = createIndexedDbWorkspace(storage());
  const parent = await w.createSituation('Parent'),
    child = await w.createSituation('Child', parent),
    third = await w.createSituation('Third', child);
  await expect(
    w.changeSituationConnection({
      previous: null,
      next: { sourceId: parent.id, targetId: third.id, kind: 'part-of' },
      expected: [parent, third],
    }),
  ).rejects.toThrow('own subproblem');
  await expect(
    w.changeSituationConnection({
      previous: null,
      next: { sourceId: child.id, targetId: parent.id, kind: 'related' },
      expected: [child, parent],
    }),
  ).rejects.toThrow('already have a connection');
  await expect(
    w.changeSituationConnection({
      previous: null,
      next: { sourceId: parent.id, targetId: parent.id, kind: 'related' },
      expected: [parent],
    }),
  ).rejects.toThrow();
  await w.changeSituationConnection({
    previous: null,
    next: { sourceId: parent.id, targetId: third.id, kind: 'related' },
    expected: [parent, third],
  });
  validateSituationGraph(await w.listSituations());
  expect(() =>
    validateSituationGraph([
      { ...parent, connections: [{ targetId: 'missing', kind: 'related' }] },
    ]),
  ).toThrow('missing');
  expect(() => parseMapPosition({ x: Infinity, y: 0 })).toThrow();
  expect(() =>
    parseSituation({ ...child, connections: [{ targetId: child.id, kind: 'part-of' }] }),
  ).toThrow();
  w.close();
});
it('deleting a situation removes its incoming connections and preserves the surviving notebooks', async () => {
  const w = createIndexedDbWorkspace(storage());
  const parent = await w.createSituation('Parent'),
    child = await w.createSituation('Child', parent);
  const notebook = { ...emptyBearingsNotebook(), draft: 'Survives' };
  await w.updateSituation(child.id, { title: child.title, context: '', notebook }, child.revision);
  await w.deleteSituation(parent.id, parent.revision);
  expect(await w.listSituations()).toMatchObject([{ id: child.id, notebook, connections: [] }]);
  validateSituationGraph((await w.readWorkspaceData()).situations);
  w.close();
});

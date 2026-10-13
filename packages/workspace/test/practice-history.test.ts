import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { Dexie } from 'dexie';
import { describe, expect, it } from 'vitest';
import {
  createIndexedDbWorkspace,
  parsePracticeArchive,
  serializePracticeArchive,
  searchPracticeRuns,
  type PracticeRunInput,
} from '../src/index.js';

const input: PracticeRunInput = {
  id: 'run-one',
  patternRef: { sourceId: 'commons', entityId: 'define-the-decision-before-comparing-options' },
  patternType: 'pattern',
  patternTitle: 'Define the Decision',
  title: 'Planning the release',
  verseIds: ['decision-making'],
  origin: 'patternverse',
  status: 'in-progress',
  revision: 1,
  responses: [{ id: 'q1', prompt: 'What matters?', answer: 'Keep ongoing hosting costs low.' }],
  checkpoint: '{"test":"checkpoint"}',
};
const open = (indexedDB = new IDBFactory(), name = crypto.randomUUID()) =>
  createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: name,
    now: () => new Date('2026-10-05T10:00:00Z'),
  });
describe('private practice history', () => {
  it('persists runs, preserves renamed titles during autosave, and never overwrites another run', async () => {
    const idb = new IDBFactory();
    const name = crypto.randomUUID();
    const workspace = open(idb, name);
    await workspace.savePracticeRun(input);
    await workspace.renamePracticeRun(input.id, 'My smaller launch');
    await workspace.savePracticeRun({ ...input, revision: 2, status: 'completed' });
    await workspace.savePracticeRun({ ...input, id: 'run-two' });
    expect((await workspace.listPracticeRuns()).length).toBe(2);
    expect(await workspace.getPracticeRun(input.id)).toMatchObject({
      title: 'My smaller launch',
      revision: 2,
      status: 'completed',
    });
    await expect(workspace.savePracticeRun(input)).rejects.toThrow('changed elsewhere');
    await expect(
      workspace.savePracticeRun({
        ...input,
        revision: 2,
        status: 'completed',
        responses: [
          { id: 'q1', prompt: 'What matters?', answer: 'A different same-revision answer' },
        ],
      }),
    ).rejects.toThrow('changed elsewhere');
    await expect(
      workspace.savePracticeRun({
        ...input,
        patternRef: { sourceId: 'personal', entityId: 'other' },
      }),
    ).rejects.toThrow('different');
    const data = await workspace.readWorkspaceData();
    expect(data.practiceRuns).toHaveLength(2);
    expect(data.entities).toHaveLength(0);
    workspace.close();
    const reopened = open(idb, name);
    expect((await reopened.getPracticeRun(input.id))?.responses).toEqual(input.responses);
    await reopened.deletePracticeRun(input.id);
    expect(await reopened.getPracticeRun(input.id)).toBeUndefined();
    expect(await reopened.listPracticeRuns()).toHaveLength(1);
    reopened.close();
  });
  it('adds history to v2 without changing workspace identity or existing records', async () => {
    const indexedDB = new IDBFactory();
    const name = crypto.randomUUID();
    const legacy = new Dexie(name, { indexedDB, IDBKeyRange });
    legacy.version(2).stores({
      entities: 'id, workspaceId, type, status, updatedAt',
      usefulness: 'refKey, workspaceId, sourceId, entityId, updatedAt',
      workspaces: 'id, &localKey',
      favorites: 'refKey, workspaceId, createdAt',
    });
    const workspace = {
      id: 'existing-owner',
      localKey: 'personal',
      name: 'My work',
      kind: 'personal',
      visibility: 'private',
      owner: { kind: 'local', actorId: 'actor' },
      createdAt: '2026-09-01T10:00:00Z',
    };
    await legacy.table('workspaces').add(workspace);
    const favorite = {
      refKey: 'commons:observer',
      workspaceId: workspace.id,
      ref: { sourceId: 'commons', entityId: 'observer' },
      createdAt: workspace.createdAt,
    };
    await legacy.table('favorites').add(favorite);
    legacy.close();
    const migrated = open(indexedDB, name);
    expect((await migrated.getWorkspace()).id).toBe(workspace.id);
    expect(await migrated.listPracticeRuns()).toEqual([]);
    expect(await migrated.listFavorites()).toEqual([
      { workspaceId: workspace.id, ref: favorite.ref, createdAt: workspace.createdAt },
    ]);
    await migrated.savePracticeRun(input);
    expect((await migrated.getPracticeRun(input.id))?.workspaceId).toBe(workspace.id);
    migrated.close();
  });
  it('searches actual responses with multiple terms and combines verse/status filters', async () => {
    const workspace = open();
    await workspace.savePracticeRun(input);
    await workspace.savePracticeRun({
      ...input,
      id: 'learning-run',
      verseIds: ['learning'],
      status: 'completed',
      responses: [{ id: 'q1', prompt: 'Recall?', answer: 'Use spaced retrieval.' }],
    });
    const runs = await workspace.listPracticeRuns();
    expect(searchPracticeRuns(runs, 'HOSTING costs')).toHaveLength(1);
    expect(searchPracticeRuns(runs, 'retrieval', 'learning', 'completed')).toHaveLength(1);
    expect(searchPracticeRuns(runs, 'retrieval', 'learning', 'in-progress')).toHaveLength(0);
    workspace.close();
  });
  it('exports an allowlisted portable record without ownership, accepts valid input and rejects malformed data', async () => {
    const workspace = open();
    const saved = await workspace.savePracticeRun(input);
    const archive = serializePracticeArchive(saved);
    expect(parsePracticeArchive(archive)).toEqual(input);
    expect(archive).not.toContain('workspaceId');
    expect(archive).not.toContain((await workspace.getWorkspace()).owner.actorId);
    expect(() => parsePracticeArchive('{"format":"different","version":1}')).toThrow();
    for (const patch of [
      { revision: -1 },
      { patternRef: { sourceId: '../secret', entityId: 'id' } },
      { responses: [input.responses[0], input.responses[0]] },
      { checkpoint: 'x'.repeat(2 * 1024 * 1024 + 1) },
      { title: '' },
    ])
      expect(() => serializePracticeArchive({ ...input, ...patch } as PracticeRunInput)).toThrow();
    const enriched = JSON.parse(archive);
    enriched.run.secret = 'not-exported';
    enriched.run.workspaceId = 'another-owner';
    expect(JSON.stringify(parsePracticeArchive(JSON.stringify(enriched)))).not.toContain(
      'not-exported',
    );
    workspace.close();
  });
});

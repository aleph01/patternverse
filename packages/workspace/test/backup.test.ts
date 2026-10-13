import { Dexie } from 'dexie';
import { encode } from 'cborg';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createIndexedDbWorkspace, type LocalWorkspace } from '../src/index.js';
import {
  createWorkspaceBackup,
  decodeWorkspaceBackup,
  encodeWorkspaceBackup,
  MAX_WORKSPACE_BACKUP_BYTES,
  parseWorkspaceBackup,
} from '../src/backup.js';

function local(indexedDB = new IDBFactory(), databaseName = crypto.randomUUID()) {
  return createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName,
    now: () => new Date('2026-10-06T10:00:00Z'),
  });
}
async function populated(workspace: LocalWorkspace) {
  await workspace.renameWorkspace('My saved ideas');
  await workspace.createEntity({
    id: 'my-verse',
    type: 'verse',
    title: 'My verse',
    body: 'A private lens.',
  });
  await workspace.createEntity({
    id: 'my-pattern',
    type: 'pattern',
    title: 'Private café 🌿',
    body: '# My article\n\n!ask “What matters?”',
    verses: ['my-verse'],
  });
  await workspace.createEntity({
    id: 'my-collection',
    type: 'collection',
    title: 'My collection',
    body: '',
    items: ['my-pattern', 'observer'],
    verses: ['my-verse'],
  });
  await workspace.setFavorite({ sourceId: 'commons', entityId: 'observer' }, true);
  await workspace.setFavorite({ sourceId: 'personal', entityId: 'my-pattern' }, true);
  await workspace.setUsefulness({ sourceId: 'commons', entityId: 'observer' }, 2);
  await workspace.savePracticeRun({
    id: 'saved-run',
    patternRef: { sourceId: 'personal', entityId: 'my-pattern' },
    patternType: 'pattern',
    patternTitle: 'Private café 🌿',
    title: 'My reflection',
    verseIds: ['my-verse'],
    origin: 'chatgpt',
    status: 'in-progress',
    revision: 3,
    checkpoint: '{"checkpoint":"opaque; validate on resume"}',
    responses: [{ id: 'thought', prompt: 'What matters?', answer: 'Less pressure.' }],
  });
  return createWorkspaceBackup(await workspace.readWorkspaceData());
}

describe('portable workspace backups', () => {
  it('round-trips articles, relationships, Unicode and saved checkpoints as standard binary CBOR', async () => {
    const workspace = local();
    const backup = await populated(workspace);
    const bytes = encodeWorkspaceBackup(backup);
    expect(bytes[0]).not.toBe(123); // Not JSON text.
    expect(decodeWorkspaceBackup(bytes)).toEqual(backup);
    expect(bytes.byteLength).toBeLessThan(
      new TextEncoder().encode(JSON.stringify(backup, null, 2)).byteLength,
    );
    expect(backup.workspace).not.toHaveProperty('owner');
    workspace.close();
  });
  it('accepts old JSON exports, including ones predating saved practice responses', async () => {
    const workspace = local();
    const backup = await populated(workspace);
    expect(
      decodeWorkspaceBackup(new TextEncoder().encode(JSON.stringify(backup, null, 2))),
    ).toEqual(backup);
    const legacy = Object.fromEntries(
      Object.entries(backup).filter(([key]) => key !== 'practiceRuns'),
    );
    expect(parseWorkspaceBackup(legacy).practiceRuns).toEqual([]);
    workspace.close();
  });
  it('rejects corrupt, truncated, concatenated, unsupported and oversized files', async () => {
    const workspace = local();
    const backup = await populated(workspace);
    const bytes = encodeWorkspaceBackup(backup);
    for (const bad of [
      new Uint8Array(),
      bytes.slice(0, -1),
      new Uint8Array([...bytes, 0]),
      new Uint8Array([255]),
      new Uint8Array(MAX_WORKSPACE_BACKUP_BYTES + 1),
    ])
      expect(() => decodeWorkspaceBackup(bad)).toThrow();
    expect(() => parseWorkspaceBackup({ ...backup, version: 2 })).toThrow('supported');
    expect(() => decodeWorkspaceBackup(encode({ ...backup, version: 9007199254740992n }))).toThrow(
      'unreadable',
    );
    workspace.close();
  });
  it('rejects public records, invalid records, duplicates and mixed ownership before writing', async () => {
    const workspace = local();
    const backup = await populated(workspace);
    const original = await workspace.readWorkspaceData();
    const invalid = [
      { ...backup, entities: [{ ...backup.entities[0], sourceId: 'commons' }] },
      { ...backup, entities: [{ ...backup.entities[0], title: '' }] },
      { ...backup, entities: [...backup.entities, backup.entities[0]] },
      { ...backup, favorites: [...backup.favorites, backup.favorites[0]] },
      { ...backup, favorites: [{ ...backup.favorites[0], workspaceId: 'someone-else' }] },
      { ...backup, usefulness: [{ ...backup.usefulness[0], usefulness: null }] },
      { ...backup, practiceRuns: [{ ...backup.practiceRuns[0], updatedAt: 'not-a-date' }] },
      { ...backup, practiceRuns: null },
      { ...backup, practiceRuns: [...backup.practiceRuns, backup.practiceRuns[0]] },
    ];
    for (const value of invalid) {
      await expect(workspace.replaceFromBackup(value as typeof backup)).rejects.toThrow();
      expect(await workspace.readWorkspaceData()).toEqual(original);
      expect(await workspace.getRecoveryBackup()).toBeUndefined();
    }
    workspace.close();
  });
});

describe('confirmed replacement storage', () => {
  it('replaces all private tables, remaps ownership and preserves this device identity', async () => {
    const source = local();
    const backup = await populated(source);
    const target = local();
    await target.createEntity({ id: 'old-pattern', type: 'pattern', title: 'Old', body: '' });
    await target.setUsefulness({ sourceId: 'commons', entityId: 'old' }, 0);
    const identity = await target.getWorkspace();
    const before = await target.readWorkspaceData();
    await target.replaceFromBackup(backup);
    const restored = await target.readWorkspaceData();
    expect(restored.entities).toEqual(backup.entities);
    expect(restored.workspace).toMatchObject({ id: identity.id, name: backup.workspace.name });
    expect(await target.getWorkspace()).toMatchObject({ id: identity.id, owner: identity.owner });
    expect(restored.favorites).toEqual(
      backup.favorites.map((r) => ({ ...r, workspaceId: identity.id })),
    );
    const savedEntries = await target.listSavedEntries();
    expect(savedEntries).toHaveLength(restored.favorites.length);
    expect(savedEntries).toEqual(expect.arrayContaining([...restored.favorites]));
    expect(await target.getSavedEntry({ sourceId: 'commons', entityId: 'observer' })).toMatchObject(
      {
        workspaceId: identity.id,
        ref: { sourceId: 'commons', entityId: 'observer' },
      },
    );
    expect(restored.usefulness).toEqual(
      backup.usefulness.map((r) => ({ ...r, workspaceId: identity.id })),
    );
    expect(restored.practiceRuns).toEqual(
      backup.practiceRuns.map((r) => ({ ...r, workspaceId: identity.id })),
    );
    expect(await target.getRecoveryBackup()).toMatchObject(before);
    source.close();
    target.close();
  });
  it('keeps a binary safety copy across reopening and can restore it, including edits after preview', async () => {
    const source = local();
    const backup = await populated(source);
    const indexedDB = new IDBFactory();
    const name = crypto.randomUUID();
    const target = local(indexedDB, name);
    await target.createEntity({
      id: 'newer',
      type: 'pattern',
      title: 'Changed after preview',
      body: '',
    });
    const before = await target.readWorkspaceData();
    await target.replaceFromBackup(backup);
    target.close();
    const reopened = local(indexedDB, name);
    const recovery = await reopened.getRecoveryBackup();
    expect(recovery).toMatchObject(before);
    await reopened.replaceFromBackup(recovery!);
    expect(await reopened.readWorkspaceData()).toEqual(before);
    expect((await reopened.getRecoveryBackup())?.entities).toEqual(backup.entities);
    const inspect = new Dexie(name, { indexedDB, IDBKeyRange });
    await inspect.open();
    expect((await inspect.table('recoveryBackups').get('before-restore')).bytes).toBeInstanceOf(
      Uint8Array,
    );
    inspect.close();
    reopened.close();
    source.close();
  });
  it('rolls back the safety snapshot, deletes and metadata if a later insert fails', async () => {
    const source = local();
    const backup = await populated(source);
    const indexedDB = new IDBFactory();
    const name = crypto.randomUUID();
    const target = local(indexedDB, name);
    // Establish a previous recovery copy that must also survive the failed transaction.
    await target.replaceFromBackup(createWorkspaceBackup(await target.readWorkspaceData()));
    await target.createEntity({ id: 'keep-me', type: 'pattern', title: 'Keep me', body: '' });
    const before = await target.readWorkspaceData();
    const recoveryBefore = await target.getRecoveryBackup();
    const inspect = new Dexie(name, { indexedDB, IDBKeyRange });
    await inspect.open();
    await inspect.table('entities').add({
      ...backup.entities[0],
      workspaceId: 'unrelated-workspace',
      createdAt: backup.exportedAt,
      updatedAt: backup.exportedAt,
    });
    await expect(target.replaceFromBackup(backup)).rejects.toThrow();
    expect(await target.readWorkspaceData()).toEqual(before);
    expect(await target.getRecoveryBackup()).toEqual(recoveryBefore);
    expect((await inspect.table('entities').get(backup.entities[0]!.id)).workspaceId).toBe(
      'unrelated-workspace',
    );
    inspect.close();
    target.close();
    source.close();
  });
  it('allows an explicitly confirmed empty backup to clear the private workspace with recovery', async () => {
    const source = local();
    const empty = createWorkspaceBackup(await source.readWorkspaceData());
    const target = local();
    const full = await populated(target);
    await target.replaceFromBackup(empty);
    expect((await target.readWorkspaceData()).entities).toEqual([]);
    expect((await target.readWorkspaceData()).practiceRuns).toEqual([]);
    expect((await target.getRecoveryBackup())?.entities).toEqual(full.entities);
    target.close();
    source.close();
  });
});

import { webcrypto } from 'node:crypto';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import { createIndexedDbWorkspace } from '@patternverse/workspace';
import { createPrivateMiraStore } from '$lib/mira/private-store';
import { createSession } from '@patternverse/companion-core';
import { createWorkspaceBackup } from '@patternverse/workspace/backup';

const openDatabase = (indexedDB: IDBFactory, name: string, version?: number) =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(name, version);
    request.onupgradeneeded = () => {
      const entities = request.result.createObjectStore('entities', { keyPath: 'id' });
      for (const field of ['type', 'status', 'updatedAt']) entities.createIndex(field, field);
      const usefulness = request.result.createObjectStore('usefulness', { keyPath: 'refKey' });
      for (const field of ['sourceId', 'entityId', 'updatedAt'])
        usefulness.createIndex(field, field);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

const inspectDatabase = (database: IDBDatabase) =>
  Promise.all(
    Array.from(database.objectStoreNames).map(
      (name) =>
        new Promise<{ name: string; records: unknown[] }>((resolve, reject) => {
          const request = database.transaction(name).objectStore(name).getAll();
          request.onsuccess = () => resolve({ name, records: request.result });
          request.onerror = () => reject(request.error);
        }),
    ),
  );

it('migrates library ownership without reading, moving or changing Mira settings and encrypted history', async () => {
  const indexedDB = new IDBFactory();
  const workspaceName = `workspace-${crypto.randomUUID()}`;
  const miraName = `mira-${crypto.randomUUID()}`;
  // Dexie schema version 1 corresponds to native IndexedDB version 10.
  const legacy = await openDatabase(indexedDB, workspaceName, 10);
  await new Promise<void>((resolve, reject) => {
    const transaction = legacy.transaction('entities', 'readwrite');
    transaction.objectStore('entities').add({
      id: 'private-pattern',
      type: 'pattern',
      sourceId: 'personal',
      status: 'draft',
      title: 'Private knowledge',
      body: 'My article',
      createdAt: '2026-08-01',
      updatedAt: '2026-08-02',
    });
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
  legacy.close();
  const mira = createPrivateMiraStore({
    indexedDB,
    crypto: webcrypto as Crypto,
    databaseName: miraName,
  });
  const settings = {
    ...(await mira.loadSettings()),
    openRouterKey: 'test-device-only-secret',
    promptOverrides: { cbt: 'Private prompt override' },
  };
  const session = {
    ...createSession('private-session', 'cbt', '2026-10-03T10:00:00Z'),
    title: 'Private reflection',
  };
  await mira.saveSettings(settings);
  await mira.save(session);
  const inspect = await openDatabase(indexedDB, miraName);
  const before = await inspectDatabase(inspect);

  const workspace = createIndexedDbWorkspace({
    indexedDB,
    IDBKeyRange,
    databaseName: workspaceName,
  });
  await workspace.getWorkspace();
  await workspace.setFavorite({ sourceId: 'commons', entityId: 'observer' }, true);
  const data = await workspace.readWorkspaceData();
  expect(JSON.stringify(data)).not.toContain('test-device-only-secret');
  expect(JSON.stringify(data)).not.toContain('Private reflection');
  expect(JSON.stringify(data)).not.toContain('Private prompt override');
  expect(data.entities).toHaveLength(1);
  await workspace.replaceFromBackup(
    createWorkspaceBackup({ ...data, entities: [], practiceRuns: [] }),
  );
  expect((await workspace.getRecoveryBackup())?.entities).toHaveLength(1);
  expect(await mira.loadSettings()).toEqual(settings);
  expect(await mira.list()).toEqual([session]);
  const after = await inspectDatabase(inspect);
  expect(after).toEqual(before);
  inspect.close();
  workspace.close();
});

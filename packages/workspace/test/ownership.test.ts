import { Dexie } from 'dexie';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createIndexedDbWorkspace, personalStatusLabel } from '../src/index.js';

const original = {
  id: 'private-pattern',
  sourceId: 'personal',
  type: 'pattern' as const,
  title: 'My existing pattern',
  body: 'Original full article.',
  status: 'published' as const,
  verses: ['my-verse'],
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-02T10:00:00.000Z',
};
const originalUsefulness = {
  refKey: 'commons:private-pattern',
  sourceId: 'commons',
  entityId: 'private-pattern',
  usefulness: 2,
  updatedAt: '2026-08-03T10:00:00.000Z',
};
const options = (indexedDB = new IDBFactory()) => ({
  indexedDB,
  IDBKeyRange,
  databaseName: 'ownership-test',
  now: () => new Date('2026-10-03T10:00:00.000Z'),
});

describe('local workspace ownership', () => {
  it('lists source-qualified ratings only for the current workspace', async () => {
    const dependencies = options();
    const workspace = createIndexedDbWorkspace(dependencies);
    const metadata = await workspace.getWorkspace();
    await workspace.setUsefulness({ sourceId: 'commons', entityId: 'same-id' }, 2);
    await workspace.setUsefulness({ sourceId: 'personal', entityId: 'same-id' }, 1);
    await workspace.setUsefulness({ sourceId: 'commons', entityId: 'negative' }, 0);
    const inspector = new Dexie(dependencies.databaseName, dependencies);
    await inspector.open();
    await inspector.table('usefulness').put({
      ...originalUsefulness,
      workspaceId: 'another-workspace',
    });
    const ratings = await workspace.listUsefulness();
    expect(ratings).toHaveLength(3);
    expect(ratings.every((rating) => rating.workspaceId === metadata.id)).toBe(true);
    expect(ratings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          ref: { sourceId: 'commons', entityId: 'same-id' },
          usefulness: 2,
        }),
        expect.objectContaining({
          ref: { sourceId: 'personal', entityId: 'same-id' },
          usefulness: 1,
        }),
        expect.objectContaining({
          ref: { sourceId: 'commons', entityId: 'negative' },
          usefulness: 0,
        }),
      ]),
    );
    await workspace.setUsefulness({ sourceId: 'personal', entityId: 'same-id' }, null);
    expect(await workspace.listUsefulness()).toHaveLength(2);
    inspector.close();
    workspace.close();
  });

  it('rolls back a failed upgrade and permits retry without losing legacy content', async () => {
    const dependencies = options();
    const legacy = new Dexie(dependencies.databaseName, dependencies);
    legacy.version(1).stores({
      entities: 'id, type, status, updatedAt',
      usefulness: 'refKey, sourceId, entityId, updatedAt',
    });
    await legacy.table('entities').add(original);
    legacy.close();
    const failed = createIndexedDbWorkspace({
      ...dependencies,
      now: () => {
        throw new Error('Clock unavailable');
      },
    });
    await expect(failed.getWorkspace()).rejects.toThrow('Clock unavailable');
    failed.close();
    const inspect = new Dexie(dependencies.databaseName, dependencies);
    await inspect.open();
    expect(inspect.verno).toBe(1);
    expect(await inspect.table('entities').get(original.id)).toEqual(original);
    expect(inspect.tables.map((table) => table.name).sort()).toEqual(['entities', 'usefulness']);
    inspect.close();
    const retry = createIndexedDbWorkspace(dependencies);
    expect(await retry.getEntity(original.id)).toMatchObject({
      title: original.title,
      body: original.body,
    });
    expect((await retry.getWorkspace()).visibility).toBe('private');
    retry.close();
  });

  it('creates one stable personal workspace, including concurrent initialization and reload', async () => {
    const dependencies = options();
    const first = createIndexedDbWorkspace(dependencies);
    const second = createIndexedDbWorkspace(dependencies);
    const [a, b] = await Promise.all([first.getWorkspace(), second.getWorkspace()]);
    expect(a).toEqual(b);
    expect(a).toMatchObject({
      name: 'My Workspace',
      kind: 'personal',
      visibility: 'private',
      owner: { kind: 'local' },
    });
    expect(a.id).not.toBe(a.owner.actorId);
    first.close();
    second.close();
    const reopened = createIndexedDbWorkspace(dependencies);
    expect(await reopened.getWorkspace()).toEqual(a);
    reopened.close();
  });

  it('atomically migrates v1 ownership without changing content, references, statuses or timestamps', async () => {
    const dependencies = options();
    const legacy = new Dexie(dependencies.databaseName, dependencies);
    legacy.version(1).stores({
      entities: 'id, type, status, updatedAt',
      usefulness: 'refKey, sourceId, entityId, updatedAt',
    });
    await legacy.table('entities').add(original);
    await legacy.table('usefulness').add(originalUsefulness);
    legacy.close();

    const upgraded = createIndexedDbWorkspace(dependencies);
    const metadata = await upgraded.getWorkspace();
    const { createdAt, updatedAt, ...rawOriginal } = original;
    expect(await upgraded.listEntities()).toEqual([rawOriginal]);
    expect(await upgraded.getUsefulness({ sourceId: 'commons', entityId: original.id })).toBe(2);
    const inspect = new Dexie(dependencies.databaseName, dependencies);
    await inspect.open();
    expect(await inspect.table('entities').get(original.id)).toEqual({
      ...original,
      workspaceId: metadata.id,
    });
    expect(await inspect.table('usefulness').get(originalUsefulness.refKey)).toEqual({
      ...originalUsefulness,
      workspaceId: metadata.id,
    });
    expect(await inspect.table('workspaces').count()).toBe(1);
    expect(await inspect.table('favorites').count()).toBe(0);
    expect(createdAt).not.toBe(metadata.createdAt);
    expect(updatedAt).not.toBe(metadata.createdAt);
    inspect.close();
    upgraded.close();

    const again = createIndexedDbWorkspace(dependencies);
    expect(await again.getWorkspace()).toEqual(metadata);
    expect(await again.listEntities()).toEqual([rawOriginal]);
    expect((await again.readWorkspaceData()).usefulness).toEqual([
      {
        workspaceId: metadata.id,
        ref: { sourceId: originalUsefulness.sourceId, entityId: originalUsefulness.entityId },
        usefulness: 2,
        updatedAt: originalUsefulness.updatedAt,
      },
    ]);
    again.close();
  });

  it('owns new and updated entities without exposing ownership fields in the article schema', async () => {
    const dependencies = options();
    const workspace = createIndexedDbWorkspace(dependencies);
    const created = await workspace.createEntity({
      id: 'mine',
      title: 'Mine',
      type: 'pattern',
      body: '',
    });
    expect(created).not.toHaveProperty('workspaceId');
    await workspace.updateEntity(created.id, (entity) => ({ ...entity, status: 'published' }));
    expect(await workspace.getEntity(created.id)).toMatchObject({
      sourceId: 'personal',
      status: 'published',
    });
    const inspector = new Dexie(dependencies.databaseName, dependencies);
    await inspector.open();
    expect((await inspector.table('entities').get(created.id)).workspaceId).toBe(
      (await workspace.getWorkspace()).id,
    );
    inspector.close();
    workspace.close();
  });

  it('keeps source-qualified favorites without duplicate records or copied articles', async () => {
    const dependencies = options();
    const workspace = createIndexedDbWorkspace(dependencies);
    const commons = { sourceId: 'commons', entityId: 'observer' };
    const other = { sourceId: 'other-source', entityId: 'observer' };
    await Promise.all([workspace.setFavorite(commons, true), workspace.setFavorite(commons, true)]);
    await workspace.setFavorite(other, true);
    expect(await workspace.listEntities()).toEqual([]);
    expect((await workspace.listFavorites()).map((favorite) => favorite.ref)).toEqual([
      other,
      commons,
    ]);
    expect(await workspace.getFavorite(commons)).toMatchObject({
      workspaceId: (await workspace.getWorkspace()).id,
      ref: commons,
    });
    workspace.close();
    const reopened = createIndexedDbWorkspace(dependencies);
    // Existing favorites become saved library references without a second store.
    expect(await reopened.listSavedEntries()).toHaveLength(2);
    expect(await reopened.getSavedEntry(commons)).toMatchObject({ ref: commons });
    await reopened.setSavedEntry(commons, false);
    expect(await reopened.getFavorite(commons)).toBeUndefined();
    expect((await reopened.listFavorites()).map((favorite) => favorite.ref)).toEqual([other]);
    expect(await reopened.listEntities()).toEqual([]);
    await expect(
      reopened.setFavorite({ sourceId: 'bad/source', entityId: 'observer' }, true),
    ).rejects.toThrow();
    reopened.close();
  });

  it('saves a collection reference without copying its members or changing usefulness ratings', async () => {
    const workspace = createIndexedDbWorkspace(options());
    const collection = { sourceId: 'commons', entityId: 'gof-design-patterns' };
    const pattern = { sourceId: 'commons', entityId: 'observer' };
    await workspace.setUsefulness(pattern, 2);
    expect(await workspace.listSavedEntries()).toEqual([]);
    await workspace.setSavedEntry(collection, true);
    expect((await workspace.listSavedEntries()).map((entry) => entry.ref)).toEqual([collection]);
    expect(await workspace.getSavedEntry(pattern)).toBeUndefined();
    expect(await workspace.listEntities()).toEqual([]);
    await workspace.setSavedEntry(collection, false);
    expect(await workspace.getUsefulness(pattern)).toBe(2);
    workspace.close();
  });

  it('projects only workspace data, excluding local actor identity and arbitrary device-secret fields', async () => {
    const dependencies = options();
    const first = createIndexedDbWorkspace(dependencies);
    const metadata = await first.getWorkspace();
    await first.setFavorite({ sourceId: 'commons', entityId: 'observer' }, true);
    await first.setUsefulness({ sourceId: 'commons', entityId: 'observer' }, 1);
    first.close();
    const inspector = new Dexie(dependencies.databaseName, dependencies);
    await inspector.open();
    await inspector.table('workspaces').update(metadata.id, {
      openRouterKey: 'device-secret',
      transientPrompt: 'unsent private draft',
    });
    await inspector.table('favorites').update('commons:observer', { cacheSecret: 'device-secret' });
    inspector.close();
    const workspace = createIndexedDbWorkspace(dependencies);
    const data = await workspace.readWorkspaceData();
    expect(Object.keys(data).sort()).toEqual([
      'entities',
      'favorites',
      'practiceRuns',
      'situations',
      'usefulness',
      'workspace',
    ]);
    expect(data.workspace).not.toHaveProperty('owner');
    expect(JSON.stringify(data)).not.toContain(metadata.owner.actorId);
    expect(JSON.stringify(data)).not.toContain('device-secret');
    expect(JSON.stringify(data)).not.toContain('unsent private draft');
    expect(await workspace.getWorkspace()).not.toHaveProperty('openRouterKey');
    expect(data.favorites).toHaveLength(1);
    workspace.close();
  });

  it('uses private local status labels without changing the canonical status values', () => {
    expect(
      ['draft', 'published', 'deprecated'].map((status) =>
        personalStatusLabel(status as typeof original.status),
      ),
    ).toEqual(['draft', 'ready', 'archived']);
  });
});

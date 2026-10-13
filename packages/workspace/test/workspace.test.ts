import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';

import {
  createLibrary,
  createLibrarySearch,
  createPersonalSource,
  createIndexedDbWorkspace,
  mergeLibraryEntries,
  type CreatePersonalEntityInput,
  type LibrarySource,
  type RawEntity,
} from '../src/index.js';

const example: CreatePersonalEntityInput = {
  id: 'my-debugging-pattern',
  type: 'pattern',
  title: 'My Debugging Pattern',
  summary: 'A personal approach to difficult bugs.',
  body: 'Make the failing behavior smaller before changing it.',
};

const createTestWorkspace = (
  indexedDB = new IDBFactory(),
  databaseName = 'patternverse-workspace-test',
) =>
  createIndexedDbWorkspace({
    databaseName,
    indexedDB,
    IDBKeyRange,
    now: () => new Date('2026-08-05T10:00:00.000Z'),
  });

describe('IndexedDB personal workspace', () => {
  it('persists a private workspace name without changing identity or ownership', async () => {
    const indexedDB = new IDBFactory();
    const workspace = createTestWorkspace(indexedDB);
    const before = await workspace.getWorkspace();
    await expect(workspace.renameWorkspace('  My ideas  ')).resolves.toEqual({
      ...before,
      name: 'My ideas',
    });
    await expect(workspace.renameWorkspace(' ')).rejects.toThrow('name');
    workspace.close();
    const restored = createTestWorkspace(indexedDB);
    await expect(restored.getWorkspace()).resolves.toEqual({ ...before, name: 'My ideas' });
    restored.close();
  });

  it('rolls back invalid batches and cleans only personal references on deletion', async () => {
    const workspace = createTestWorkspace();
    await workspace.createEntity(example);
    const ref = { sourceId: 'personal', entityId: example.id };
    const publicRef = { sourceId: 'commons', entityId: example.id };
    await workspace.setFavorite(ref, true);
    await workspace.setFavorite(publicRef, true);
    await workspace.setUsefulness(ref, 1);
    await expect(
      workspace.mutateEntities((current) => [{ ...current[0]!, title: '' }]),
    ).rejects.toThrow();
    await expect(workspace.getEntity(example.id)).resolves.toMatchObject({ title: example.title });
    await expect(
      workspace.mutateEntities((current) => [{ ...current[0]!, id: 'different-id' }]),
    ).rejects.toThrow('IDs');
    await workspace.mutateEntities(() => []);
    await expect(workspace.listEntities()).resolves.toEqual([]);
    await expect(workspace.getFavorite(ref)).resolves.toBeUndefined();
    await expect(workspace.getFavorite(publicRef)).resolves.toBeDefined();
    await expect(workspace.getUsefulness(ref)).resolves.toBeNull();
    workspace.close();
  });
  it('creates Draft entities and supports read and list operations', async () => {
    const workspace = createTestWorkspace();

    const created = await workspace.createEntity(example);

    expect(created.status).toBe('draft');
    expect(created.sourceId).toBe('personal');
    await expect(workspace.getEntity(example.id)).resolves.toEqual(created);
    await expect(workspace.listEntities()).resolves.toEqual([created]);
    workspace.close();
  });

  it('updates, validates stable IDs, and deletes entities', async () => {
    const workspace = createTestWorkspace();
    await workspace.createEntity(example);

    const published = await workspace.updateEntity(example.id, (current) => ({
      ...current,
      title: 'A Better Debugging Pattern',
      status: 'published',
    }));

    expect(published.title).toBe('A Better Debugging Pattern');
    expect(published.status).toBe('published');
    await expect(
      workspace.updateEntity(example.id, (current) => ({ ...current, id: 'changed-id' })),
    ).rejects.toThrow('Entity IDs are stable');
    await expect(workspace.deleteEntity(example.id)).resolves.toBe(true);
    await expect(workspace.deleteEntity(example.id)).resolves.toBe(false);
    await expect(workspace.getEntity(example.id)).resolves.toBeUndefined();
    workspace.close();
  });

  it('persists entities when the workspace connection is reopened', async () => {
    const indexedDB = new IDBFactory();
    const first = createTestWorkspace(indexedDB, 'persistent-workspace');
    await first.createEntity(example);
    first.close();

    const reopened = createTestWorkspace(indexedDB, 'persistent-workspace');
    await expect(reopened.getEntity(example.id)).resolves.toMatchObject({
      id: example.id,
      sourceId: 'personal',
      status: 'draft',
    });
    reopened.close();
  });

  it('stores private usefulness for personal and external entity references', async () => {
    const workspace = createTestWorkspace();
    const ref = { sourceId: 'commons', entityId: 'creative-reframing' } as const;

    await expect(workspace.getUsefulness(ref)).resolves.toBeNull();
    await workspace.setUsefulness(ref, 0);
    await expect(workspace.getUsefulness(ref)).resolves.toBe(0);
    await workspace.setUsefulness(ref, 2);
    await expect(workspace.getUsefulness(ref)).resolves.toBe(2);
    await workspace.setUsefulness(ref, null);
    await expect(workspace.getUsefulness(ref)).resolves.toBeNull();
    workspace.close();
  });

  it('rejects duplicate IDs within the personal source', async () => {
    const workspace = createTestWorkspace();
    await workspace.createEntity(example);
    await expect(workspace.createEntity(example)).rejects.toThrow('already exists');
    workspace.close();
  });
});

describe('unified Library calculation', () => {
  it('leads with personal entities and preserves source-qualified duplicates', () => {
    const personal = {
      ...example,
      sourceId: 'personal',
      status: 'draft',
    } as const;
    const commons = [
      {
        id: example.id,
        sourceId: 'commons',
        type: 'pattern',
        title: 'Commons Debugging Pattern',
        summary: '',
        status: 'published',
      },
    ] as const;

    const merged = mergeLibraryEntries(commons, [personal]);

    expect(merged.map((entry) => `${entry.sourceId}:${entry.id}`)).toEqual([
      'personal:my-debugging-pattern',
      'commons:my-debugging-pattern',
    ]);
  });

  it('searches personal and Commons documents through one ranked index', () => {
    const personal: RawEntity = {
      ...example,
      sourceId: 'personal',
      status: 'draft',
      aliases: ['bug shrinking'],
      tags: ['debugging', 'assumptions'],
      verses: ['systems-thinking'],
    };
    const commons: LibrarySource = {
      id: 'commons',
      name: 'Patternverse Commons',
      readonly: true,
      entries: [
        {
          id: 'creative-reframing',
          sourceId: 'commons',
          type: 'pattern',
          title: 'Creative Reframing',
          summary: 'Change how a problem is represented.',
          status: 'published',
        },
        {
          id: 'systems-thinking',
          sourceId: 'commons',
          type: 'verse',
          title: 'Systems Thinking',
          summary: 'Understand relationships and feedback.',
          status: 'published',
        },
      ],
      searchDocuments: [
        {
          id: 'commons:creative-reframing',
          entityId: 'creative-reframing',
          sourceId: 'commons',
          type: 'pattern',
          status: 'published',
          title: 'Creative Reframing',
          aliases: [],
          summary: 'Change how a problem is represented.',
          tags: ['perspective-shift'],
          body: 'Generate another interpretation.',
          verseNames: ['Creativity'],
          collectionNames: ['Getting Unstuck'],
        },
        {
          id: 'commons:systems-thinking',
          entityId: 'systems-thinking',
          sourceId: 'commons',
          type: 'verse',
          status: 'published',
          title: 'Systems Thinking',
          aliases: [],
          summary: 'Understand relationships and feedback.',
          body: '',
          verseNames: [],
          collectionNames: [],
        },
      ],
    };
    const library = createLibrary([createPersonalSource([personal], commons.entries), commons]);
    const search = createLibrarySearch(library);

    expect(search.search('refram').map((result) => result.id)).toEqual(['creative-reframing']);
    expect(search.search('perspective-shift').map((result) => result.id)).toEqual([
      'creative-reframing',
    ]);
    expect(
      search.search('assumptions', { sourceId: 'personal' }).map((result) => result.id),
    ).toEqual(['my-debugging-pattern']);
    expect(search.search('bug shrinking').map((result) => result.id)).toEqual([
      'my-debugging-pattern',
    ]);
    expect(
      search.search('systems thinking', { sourceId: 'personal' }).map((result) => result.id),
    ).toEqual(['my-debugging-pattern']);
    expect(search.search('', { type: 'verse' }).map((result) => result.id)).toEqual([
      'systems-thinking',
    ]);
    expect(search.search('getting unstuck', { sourceId: 'personal' })).toEqual([]);
  });
});

import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { expect, it } from 'vitest';
import {
  createIndexedDbWorkspace,
  emptyBearingsNotebook,
  parseBearingsNotebook,
} from '../src/index.js';
import {
  createWorkspaceBackup,
  decodeWorkspaceBackup,
  encodeWorkspaceBackup,
} from '../src/backup.js';

it('preserves notebook cells, drafts and checkpoints across reopening, old context edits, and backup restore', async () => {
  const options = { indexedDB: new IDBFactory(), IDBKeyRange, databaseName: crypto.randomUUID() };
  const workspace = createIndexedDbWorkspace(options);
  const situation = await workspace.createSituation('A difficult conversation');
  const notebook = {
    ...emptyBearingsNotebook('chapter'),
    draft: 'Unfinished thought',
    scrollTop: 340,
    chapters: [
      {
        id: 'chapter',
        title: 'Beginning',
        collapsed: false,
        cells: [
          { id: 'one', kind: 'answer' as const, text: 'Private answer' },
          { id: 'two', kind: 'note' as const, text: 'Remember' },
          { id: 'three', kind: 'approach' as const, text: 'A walk' },
          {
            id: 'four',
            kind: 'rating' as const,
            text: '',
            rating: { label: 'SUD', min: 0, max: 100, low: 'None', high: 'Extreme', value: 32 },
          },
          {
            id: 'five',
            kind: 'pattern' as const,
            text: '',
            pattern: { sourceId: 'commons', entityId: 'pause', title: 'Pause', summary: '' },
            practice: {
              ref: { sourceId: 'commons', entityId: 'practice' },
              title: 'Try',
              source: 'source',
              checkpoint: 'checkpoint',
              draft: 'unfinished field',
              status: 'in-progress' as const,
            },
          },
        ],
      },
    ],
  };
  const saved = await workspace.updateSituation(
    situation.id,
    { title: situation.title, context: 'Context', notebook },
    0,
  );
  await workspace.updateSituation(
    saved.id,
    { title: saved.title, context: 'Edited from the old workspace' },
    saved.revision,
  );
  await expect(
    workspace.updateSituation(
      saved.id,
      { title: saved.title, context: 'Stale', notebook },
      saved.revision,
    ),
  ).rejects.toThrow('another window');
  workspace.close();
  const reopened = createIndexedDbWorkspace(options);
  expect((await reopened.listSituations())[0]?.notebook).toEqual(notebook);
  const target = createIndexedDbWorkspace({ ...options, databaseName: crypto.randomUUID() });
  await target.replaceFromBackup(
    decodeWorkspaceBackup(
      encodeWorkspaceBackup(createWorkspaceBackup(await reopened.readWorkspaceData())),
    ),
  );
  expect((await target.listSituations())[0]?.notebook).toEqual(notebook);
  reopened.close();
  target.close();
});
it('rejects malformed cells and scales before storage and strips extra properties', () => {
  const doc = emptyBearingsNotebook('one');
  const withCell = (cell: unknown) => ({
    ...doc,
    chapters: [{ ...doc.chapters[0], cells: [cell] }],
  });
  expect(() =>
    parseBearingsNotebook(
      withCell({
        id: 'x',
        kind: 'rating',
        text: '',
        rating: { label: 'Bad', min: 10, max: 0, low: '', high: '', value: null },
      }),
    ),
  ).toThrow();
  expect(() =>
    parseBearingsNotebook(withCell({ id: 'one', kind: 'answer', text: 'duplicate section ID' })),
  ).toThrow('Duplicate');
  expect(() => parseBearingsNotebook({ ...doc, activeChapterId: 'missing' })).toThrow();
  for (const view of ['unknown', ['document'], { toString: () => 'document' }])
    expect(() => parseBearingsNotebook({ ...doc, view })).toThrow('notebook view');
  expect(parseBearingsNotebook({ ...doc, extra: 'discard' })).not.toHaveProperty('extra');
});

it('projects reactive practice response lists into cloneable persistence data', () => {
  const doc = emptyBearingsNotebook('chapter');
  const notebook = {
    ...doc,
    chapters: [
      {
        ...doc.chapters[0]!,
        cells: [
          {
            id: 'pattern',
            kind: 'pattern',
            text: '',
            pattern: { sourceId: 'commons', entityId: 'pause', title: 'Pause', summary: '' },
            practice: {
              ref: { sourceId: 'commons', entityId: 'pause' },
              title: 'Pause',
              source: 'source',
              status: 'in-progress',
              copiedResponseIds: new Proxy(['confirmed-response'], {}),
            },
          },
        ],
      },
    ],
  };
  const parsed = parseBearingsNotebook(notebook);
  expect(structuredClone(parsed)).toEqual(parsed);
});

it.each(['tree', 'document'] as const)(
  'preserves hierarchical notes and %s view in local storage and backups',
  async (view) => {
    const workspace = createIndexedDbWorkspace({
      indexedDB: new IDBFactory(),
      IDBKeyRange,
      databaseName: crypto.randomUUID(),
    });
    const situation = await workspace.createSituation('Nested notebook');
    const notebook = {
      ...emptyBearingsNotebook('chapter'),
      view,
      activeCellId: 'child',
      treeScrollLeft: 360,
      treeScrollTop: 24,
      chapters: [
        {
          id: 'chapter',
          title: 'Beginning',
          collapsed: false,
          cells: [
            {
              id: 'parent',
              kind: 'note' as const,
              title: 'Parent',
              text: 'Context',
              collapsed: true,
            },
            {
              id: 'child',
              parentId: 'parent',
              kind: 'answer' as const,
              title: 'Child',
              text: 'Details',
            },
          ],
        },
      ],
    };
    await workspace.updateSituation(
      situation.id,
      { title: situation.title, context: '', notebook },
      situation.revision,
    );
    const backup = decodeWorkspaceBackup(
      encodeWorkspaceBackup(createWorkspaceBackup(await workspace.readWorkspaceData())),
    );
    const target = createIndexedDbWorkspace({
      indexedDB: new IDBFactory(),
      IDBKeyRange,
      databaseName: crypto.randomUUID(),
    });
    await target.replaceFromBackup(backup);
    expect((await target.listSituations())[0]?.notebook).toEqual(notebook);
    const cells = notebook.chapters[0]!.cells;
    expect(() =>
      parseBearingsNotebook({
        ...notebook,
        chapters: [
          { ...notebook.chapters[0], cells: [{ ...cells[0], parentId: 'child' }, cells[1]] },
        ],
      }),
    ).toThrow('ancestor');
    expect(() =>
      parseBearingsNotebook({
        ...notebook,
        chapters: [
          { ...notebook.chapters[0], cells: [{ ...cells[0], parentId: 'missing' }, cells[1]] },
        ],
      }),
    ).toThrow('same chapter');
    expect(() => parseBearingsNotebook({ ...notebook, activeCellId: 'missing' })).toThrow(
      'selected note',
    );
    expect(() => parseBearingsNotebook({ ...notebook, treeScrollLeft: -1 })).toThrow('scroll');
    workspace.close();
    target.close();
  },
);

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { indexedDB, IDBKeyRange } from 'fake-indexeddb';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { rawEntitySchema, type RawEntity } from '@patternverse/schema';
import { createIndexedDbWorkspace } from '@patternverse/workspace';
import { editor, initSync } from '$lib/mira/engine/pattern_wasm.js';
import { editorSignature, editorValuesFromEntity, emptyEditorValues } from '$lib/editor';
import type { Inspection } from '$lib/pattern-editor/types';
import {
  createEditorSaveWorkflow,
  type AcceptedEditorSave,
  type EditorSaveWorkspace,
} from './save-workflow';

const validInspection: Inspection = {
  structure: {
    title: null,
    revision: 'test',
    inputs: {},
    outputs: {},
    bindings: [],
    steps: [],
    dependencies: {},
  },
  diagnostics: [],
};
const source = ':language 1\n!ask answer {\nWhat helps?\n}\n-> end';
const commonVerse = { id: 'learning', type: 'verse', sourceId: 'commons' };
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (cause: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
function setup(initial: readonly RawEntity[] = []) {
  const state = {
    values: {
      ...emptyEditorValues(),
      id: 'test-pattern',
      title: 'Test Pattern',
      verses: 'learning',
      body: 'Keep this article.',
    },
    editingId: undefined as string | undefined,
    pending: false,
    available: true,
  };
  const rows = new Map(initial.map((entity) => [entity.id, entity]));
  const workspace = {
    listEntities: vi.fn<EditorSaveWorkspace['listEntities']>(async () => [...rows.values()]),
    createEntity: vi.fn<EditorSaveWorkspace['createEntity']>(async (input) => {
      if (rows.has(input.id)) throw new Error('That private ID already exists.');
      const entity = rawEntitySchema.parse({
        ...input,
        sourceId: 'personal',
        status: input.status ?? 'draft',
      });
      rows.set(entity.id, entity);
      return entity;
    }),
    updateEntity: vi.fn<EditorSaveWorkspace['updateEntity']>(async (id, transform) => {
      const current = rows.get(id);
      if (!current) throw new Error('Private entity not found.');
      const entity = transform(current);
      if (entity.id !== id) throw new Error('Entity IDs are stable.');
      rows.set(id, entity);
      return entity;
    }),
  };
  const events: string[] = [];
  const ports = {
    workspace: (): EditorSaveWorkspace | undefined => (state.available ? workspace : undefined),
    values: () => state.values,
    editingId: () => state.editingId,
    commons: () => [commonVerse],
    practicePending: () => state.pending,
    commitPending: vi.fn(() => {
      events.push('commit');
    }),
    inspect: vi.fn(async (source: string): Promise<Inspection> => {
      void source;
      return validInspection;
    }),
    started: vi.fn(),
    busyChanged: vi.fn((busy: boolean) => {
      events.push(`busy:${busy}`);
    }),
    catalogChanged: vi.fn(),
    accepted: vi.fn((saved: AcceptedEditorSave) => {
      state.editingId = saved.entity.id;
      state.values = saved.values;
      events.push('accepted');
    }),
    failed: vi.fn(),
  };
  return { state, rows, workspace, ports, events, workflow: createEditorSaveWorkflow(ports) };
}

describe('editor save coordination', () => {
  it('flushes pending keywords before capturing one normalized, private document', async () => {
    const test = setup();
    test.state.values.title = '  Test Pattern  ';
    test.state.values.aliases = 'first name';
    test.state.values.status = 'published';
    test.ports.commitPending.mockImplementation(() => {
      test.events.push('commit');
      test.state.values.tags = 'learning, testing';
      test.state.values.aliases += '\nsecond name';
    });
    await test.workflow.save();
    expect(test.events).toEqual(['commit', 'busy:true', 'accepted', 'busy:false']);
    expect(test.workspace.createEntity).toHaveBeenCalledTimes(1);
    expect(test.workspace.createEntity.mock.calls[0][0]).not.toHaveProperty('sourceId');
    expect(test.workspace.createEntity.mock.calls[0][0]).not.toHaveProperty('sourcePath');
    const saved = test.ports.accepted.mock.calls[0][0];
    expect(saved.entity).toMatchObject({
      title: 'Test Pattern',
      sourceId: 'personal',
      status: 'published',
      tags: ['learning', 'testing'],
      aliases: ['first name', 'second name'],
    });
    expect(saved.signature).toBe(editorSignature(saved.values));
    expect(test.ports.catalogChanged).toHaveBeenCalledTimes(2);
    expect(test.ports.inspect).not.toHaveBeenCalled();
  });

  it('updates the existing private identity instead of creating another record', async () => {
    const original: RawEntity = {
      id: 'test-pattern',
      type: 'pattern',
      sourceId: 'personal',
      title: 'Old title',
      status: 'draft',
      body: 'Old article.',
      verses: ['learning'],
    };
    const unrelated: RawEntity = { ...original, id: 'other', title: 'Leave this alone' };
    const test = setup([original, unrelated]);
    test.state.editingId = original.id;
    await test.workflow.save();
    expect(test.workspace.updateEntity).toHaveBeenCalledTimes(1);
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
    expect(test.rows.get(original.id)?.body).toBe('Keep this article.');
    expect(test.rows.get(unrelated.id)).toEqual(unrelated);
  });

  it('keeps schema errors and the original writing without attempting storage writes', async () => {
    const test = setup();
    test.state.values.id = 'Invalid ID';
    const before = editorSignature(test.state.values);
    await test.workflow.save();
    expect(test.ports.failed.mock.calls[0][0].join(' ')).toContain('lowercase-kebab-case');
    expect(editorSignature(test.state.values)).toBe(before);
    expect(test.workspace.listEntities).not.toHaveBeenCalled();
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
    expect(test.ports.busyChanged.mock.calls).toEqual([[true], [false]]);
  });

  it.each(['', 'missing'])('reuses the required verse-home rule for %s', async (verses) => {
    const test = setup();
    test.state.values.verses = verses;
    await test.workflow.save();
    expect(test.ports.failed.mock.calls[0][0][0]).toContain('Choose an existing verse');
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
  });

  it('checks the fresh private catalog, including shadowed public verse IDs', async () => {
    const shadow: RawEntity = {
      id: 'learning',
      type: 'pattern',
      title: 'Private shadow',
      body: '',
      sourceId: 'personal',
      status: 'draft',
    };
    const test = setup([shadow]);
    await test.workflow.save();
    expect(test.ports.catalogChanged).toHaveBeenCalledWith([shadow]);
    expect(test.ports.failed.mock.calls[0][0][0]).toContain('Choose an existing verse');
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
  });

  it('creates a verse without imposing the pattern-only home requirement', async () => {
    const test = setup();
    test.state.values.type = 'verse';
    test.state.values.verses = '';
    await test.workflow.save();
    expect(test.ports.failed).not.toHaveBeenCalled();
    expect(test.rows.get('test-pattern')?.type).toBe('verse');
  });

  it('preserves collection item order using the existing model', async () => {
    const test = setup();
    test.state.values.type = 'collection';
    test.state.values.items = ['three', 'one', 'two'];
    await test.workflow.save();
    expect(test.rows.get('test-pattern')).toMatchObject({
      type: 'collection',
      items: ['three', 'one', 'two'],
    });
  });

  it.each(['concept', 'practice'] as const)(
    'continues editing an existing legacy %s',
    async (type) => {
      const original: RawEntity = {
        id: 'old',
        type,
        sourceId: 'personal',
        title: 'Existing',
        body: 'Keep this',
        status: 'draft',
      };
      const test = setup([original]);
      test.state.values = editorValuesFromEntity(original);
      test.state.editingId = original.id;
      test.state.values.body = 'A revised article.';
      await test.workflow.save();
      expect(test.ports.failed).not.toHaveBeenCalled();
      expect(test.rows.get('old')?.body).toBe('A revised article.');
    },
  );

  it('uses compiler diagnostics before document validation and never saves invalid source', async () => {
    const test = setup();
    test.state.values.languagePracticeSource = '!show {{missing}}';
    test.state.values.id = 'Also invalid';
    test.ports.inspect.mockResolvedValue({
      structure: null,
      diagnostics: [
        { severity: 'Error', message: 'Unknown binding missing', primary: { start: 0, end: 4 } },
      ],
    });
    await test.workflow.save();
    expect(test.ports.failed).toHaveBeenCalledWith(['Unknown binding missing']);
    expect(test.state.values.languagePracticeSource).toBe('!show {{missing}}');
    expect(test.workspace.listEntities).not.toHaveBeenCalled();
  });

  it('retains source and shows the existing message if the practice compiler cannot load', async () => {
    const test = setup();
    test.state.values.languagePracticeSource = source;
    test.ports.inspect.mockRejectedValue(new Error('Bridge unavailable'));
    await test.workflow.save();
    expect(test.ports.failed).toHaveBeenCalledWith([
      'The practice compiler is unavailable. Your unsaved source is still here.',
    ]);
    expect(test.state.values.languagePracticeSource).toBe(source);
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
    expect(test.ports.busyChanged.mock.calls).toEqual([[true], [false]]);
  });

  it('reports a missing compiled structure even when no diagnostics were returned', async () => {
    const test = setup();
    test.state.values.languagePracticeSource = source;
    test.ports.inspect.mockResolvedValue({ structure: null, diagnostics: [] });
    await test.workflow.save();
    expect(test.ports.failed.mock.calls[0][0]).toHaveLength(1);
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
  });

  it('snapshots source and metadata together while compilation is in flight', async () => {
    const test = setup();
    test.state.values.languagePracticeSource = source;
    test.state.values.tags = 'first';
    const gate = deferred<Inspection>();
    test.ports.inspect.mockReturnValue(gate.promise);
    const saving = test.workflow.save();
    test.state.values.languagePracticeSource = source.replace('What helps?', 'New question?');
    test.state.values.body = 'Newer writing.';
    test.state.values.tags = 'second';
    gate.resolve(validInspection);
    await saving;
    const saved = test.ports.accepted.mock.calls[0][0];
    expect(saved.values.languagePracticeSource).toBe(source);
    expect(saved.entity).toMatchObject({
      body: expect.stringContaining('Keep this article.'),
      tags: ['first'],
    });
  });

  it('prevents duplicate clicks, including a reentrant keyword commit', async () => {
    const test = setup();
    const gate = deferred<readonly RawEntity[]>();
    test.workspace.listEntities.mockReturnValueOnce(gate.promise);
    test.ports.commitPending.mockImplementation(() => {
      void test.workflow.save();
    });
    const first = test.workflow.save();
    await test.workflow.save();
    expect(test.ports.commitPending).toHaveBeenCalledTimes(1);
    gate.resolve([]);
    await first;
    expect(test.workspace.createEntity).toHaveBeenCalledTimes(1);
  });

  it('does not flush or start a save without a workspace or while a block edit is pending', async () => {
    const test = setup();
    test.state.available = false;
    await test.workflow.save();
    test.state.available = true;
    test.state.pending = true;
    await test.workflow.save();
    test.workflow.dispose();
    test.state.pending = false;
    await test.workflow.save();
    expect(test.ports.commitPending).not.toHaveBeenCalled();
    expect(test.ports.busyChanged).not.toHaveBeenCalled();
  });

  it('recovers from a storage failure without discarding the draft or leaving save disabled', async () => {
    const test = setup();
    test.workspace.createEntity.mockRejectedValueOnce(new Error('Storage full'));
    await test.workflow.save();
    expect(test.ports.failed).toHaveBeenCalledWith(['Storage full']);
    expect(test.state.editingId).toBeUndefined();
    expect(test.state.values.body).toBe('Keep this article.');
    await test.workflow.save();
    expect(test.rows.size).toBe(1);
    expect(test.ports.accepted).toHaveBeenCalledTimes(1);
  });

  it('accepts a persisted identity before refresh failure, so retry updates instead of creating again', async () => {
    const test = setup();
    test.workspace.listEntities
      .mockResolvedValueOnce([])
      .mockRejectedValueOnce(new Error('Refresh failed'));
    await test.workflow.save();
    expect(test.state.editingId).toBe('test-pattern');
    expect(test.ports.accepted).toHaveBeenCalledTimes(1);
    expect(test.ports.failed.mock.calls[0][0][0]).toContain(
      'Saved “Test Pattern”, but the editor could not refresh',
    );
    await test.workflow.save();
    expect(test.workspace.createEntity).toHaveBeenCalledTimes(1);
    expect(test.workspace.updateEntity).toHaveBeenCalledTimes(1);
    expect(test.rows.size).toBe(1);
  });

  it.each(['compile', 'catalog', 'write', 'refresh'] as const)(
    'suppresses late work/publication after disposal during %s',
    async (stage) => {
      const test = setup();
      const started = deferred<void>();
      const gate = deferred<void>();
      if (stage === 'compile') {
        test.state.values.languagePracticeSource = source;
        test.ports.inspect.mockImplementation(async () => {
          started.resolve();
          await gate.promise;
          return validInspection;
        });
      } else if (stage === 'catalog') {
        test.workspace.listEntities.mockImplementationOnce(async () => {
          started.resolve();
          await gate.promise;
          return [];
        });
      } else if (stage === 'write') {
        const write = test.workspace.createEntity.getMockImplementation()!;
        test.workspace.createEntity.mockImplementationOnce(async (input) => {
          started.resolve();
          await gate.promise;
          return write(input);
        });
      } else {
        test.workspace.listEntities.mockResolvedValueOnce([]).mockImplementationOnce(async () => {
          started.resolve();
          await gate.promise;
          return [...test.rows.values()];
        });
      }
      const saving = test.workflow.save();
      await started.promise;
      const before = {
        accepted: test.ports.accepted.mock.calls.length,
        catalog: test.ports.catalogChanged.mock.calls.length,
        busy: test.ports.busyChanged.mock.calls.length,
      };
      test.workflow.dispose();
      gate.resolve();
      await saving;
      expect(test.ports.accepted).toHaveBeenCalledTimes(before.accepted);
      expect(test.ports.catalogChanged).toHaveBeenCalledTimes(before.catalog);
      expect(test.ports.busyChanged).toHaveBeenCalledTimes(before.busy);
      expect(test.ports.failed).not.toHaveBeenCalled();
      expect(test.workspace.createEntity).toHaveBeenCalledTimes(
        stage === 'write' || stage === 'refresh' ? 1 : 0,
      );
    },
  );

  it('suppresses a compiler failure after disposal', async () => {
    const test = setup();
    test.state.values.languagePracticeSource = source;
    const gate = deferred<Inspection>();
    test.ports.inspect.mockReturnValue(gate.promise);
    const saving = test.workflow.save();
    test.workflow.dispose();
    gate.reject(new Error('Late compiler failure'));
    await saving;
    expect(test.ports.failed).not.toHaveBeenCalled();
    expect(test.workspace.createEntity).not.toHaveBeenCalled();
  });
});

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
describe('existing compiler and private workspace integration', () => {
  it('validates and saves real Pattern Language without changing the article or public source', async () => {
    const test = setup();
    const workspace = createIndexedDbWorkspace({
      indexedDB,
      IDBKeyRange,
      databaseName: `editor-save-${crypto.randomUUID()}`,
    });
    test.ports.workspace = () => workspace;
    test.ports.inspect.mockImplementation(
      async (text) =>
        JSON.parse(editor(JSON.stringify({ operation: 'inspect', source: text }))) as Inspection,
    );
    test.state.values.languagePracticeSource = source;
    const workflow = createEditorSaveWorkflow(test.ports);
    try {
      await workflow.save();
      expect(test.ports.failed).not.toHaveBeenCalled();
      const stored = (await workspace.getEntity('test-pattern'))!;
      expect(stored.sourceId).toBe('personal');
      expect(stored.status).toBe('draft');
      expect(editorValuesFromEntity(stored)).toMatchObject({
        body: 'Keep this article.',
        languagePracticeSource: source,
      });
      test.state.values.id = 'changed-id';
      await workflow.save();
      expect(test.ports.failed.mock.calls[0][0][0]).toContain('IDs are stable');
      expect(await workspace.getEntity('changed-id')).toBeUndefined();
      expect(await workspace.getEntity('test-pattern')).toEqual(stored);
    } finally {
      workflow.dispose();
      workspace.close();
    }
  });

  it('preserves legacy article imports while saving only the existing language conversion', async () => {
    const test = setup();
    test.state.values.practice = {
      title: 'Legacy exercise',
      steps: [
        { id: 'one', blocks: [{ id: 'copy', type: 'markdown', content: 'Notice one thing.' }] },
      ],
    };
    await test.workflow.save();
    const saved = test.rows.get('test-pattern')!;
    expect(saved.body).toContain('```patternverse-language');
    expect(saved.body).not.toContain('```patternverse-practice');
    expect(editorValuesFromEntity(saved).body).toBe('Keep this article.');
    expect(test.ports.inspect).not.toHaveBeenCalled();
  });
});

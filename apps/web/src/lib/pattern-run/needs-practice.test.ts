// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createIndexedDbWorkspace } from '@patternverse/workspace';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import { bundledWidgets, isBundledWidget } from '$lib/widgets/bundled';
import { plain, widgetEnvironment } from '$lib/widgets/library';
import { startSourceRun, restoreSourceRun, serializeSourceRun } from '$lib/pattern-runtime/source';
import type { PatternRun } from '$lib/pattern-runtime/types';
import { sourcePracticeNeedsAi } from './source-practice';

const local = vi.hoisted(() => ({ workspace: undefined as unknown }));
vi.mock('$lib/client/workspace', () => ({ getLocalWorkspace: async () => local.workspace }));
const pattern = parseMarkdownEntity(
  readFileSync(resolve(process.cwd(), '../../content/patterns/identify-needs.md'), 'utf8'),
  { sourceId: 'commons', sourcePath: 'patterns/identify-needs.md' },
).entity!;
const source = pattern.languagePracticeSource!;
const execute = (request: Record<string, unknown>): PatternRun =>
  JSON.parse(editor(JSON.stringify(request)));
const answer = (run: PatternRun, result: unknown) =>
  execute({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: {
      run_id: run.view.pending!.run_id,
      event: { Fulfill: { effect_id: run.view.pending!.effect_id, result } },
    },
  });
const text = (value: string) => ({ type: 'text', value });
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

describe('Identify Needs with the shipped selector and Rust runtime', () => {
  it.each([true, false])(
    'runs on a fresh workspace, preserves canonical choices and personal wording, and restores (select = %s)',
    async (select) => {
      const workspace = createIndexedDbWorkspace({
        indexedDB: new IDBFactory(),
        IDBKeyRange,
        databaseName: crypto.randomUUID(),
      });
      local.workspace = workspace;
      try {
        expect(sourcePracticeNeedsAi(pattern)).toBe(false);
        expect(await workspace.listWidgetReleases()).toEqual([]);
        let run = await startSourceRun(source);
        expect(run.view.pending!.request.kind).toBe('interaction.form');
        run = answer(run, {
          kind: 'form',
          value: { situation: text('After a week of late meetings.') },
        });
        expect(run.view.pending!.request.kind).toBe('interaction.widget');
        const pkg = (
          run.view.pending!.request.payload as { package: (typeof bundledWidgets)[string] }
        ).package;
        expect(isBundledWidget(pkg)).toBe(true);
        const interaction = run.view.pending!.request.payload as {
          inputs: { options: { value: unknown[] } };
        };
        expect(interaction.inputs.options.value).toHaveLength(68);
        expect(await restoreSourceRun(source, serializeSourceRun(run))).toEqual(run);
        if (select) {
          expect(() =>
            answer(run, {
              kind: 'widget',
              value: { needs: [{ value: 'unknown', label: 'Unknown' }] },
            }),
          ).toThrow();
        }
        run = answer(run, {
          kind: 'widget',
          value: {
            needs: select
              ? [
                  { value: 'water', label: 'Forged' },
                  { value: 'rest', label: 'Rest' },
                ]
              : [],
          },
        });
        expect(run.view.pending!.request.kind).toBe('interaction.form');
        run = answer(run, {
          kind: 'form',
          value: {
            own_words: text('Time with no requests.'),
            meaning: text('Rest would help; I am still unsure what else matters.'),
          },
        });
        expect(run.view.status).toBe('Completed');
        expect(plain(run.view.outputs.selected_needs)).toEqual(
          select
            ? [
                { value: 'water', label: 'Water' },
                { value: 'rest', label: 'Rest' },
              ]
            : [],
        );
        expect(plain(run.view.outputs.own_words)).toBe('Time with no requests.');
        expect(plain(run.view.outputs.situation)).toBe('After a week of late meetings.');
        expect(await restoreSourceRun(source, serializeSourceRun(run))).toEqual(run);
        expect(await workspace.listWidgetReleases()).toEqual([]);
      } finally {
        workspace.close();
      }
    },
  );

  it('trusts shipped bytes independent of JSON key order, rejects modified code or catalogues, and resists local shadowing', async () => {
    const pkg = bundledWidgets['commons/needs-selector@0.1.0'];
    const reordered = { files: pkg.files, manifest: pkg.manifest, identity: pkg.identity };
    expect(isBundledWidget(reordered)).toBe(true);
    for (const filename of ['needs.js', 'catalogue.json']) {
      expect(
        isBundledWidget({ ...pkg, files: { ...pkg.files, [filename]: pkg.files[filename] + ' ' } }),
      ).toBe(false);
    }
    const workspace = createIndexedDbWorkspace({
      indexedDB: new IDBFactory(),
      IDBKeyRange,
      databaseName: crypto.randomUUID(),
    });
    local.workspace = workspace;
    try {
      const draft = await workspace.saveWidgetDraft({
        id: 'shadow',
        revision: 0,
        name: 'Shadow',
        description: '',
        package: { ...pkg, files: { ...pkg.files, 'needs.js': '// changed' } },
      });
      await workspace.saveWidgetRelease(draft.id, draft.revision);
      const environment = await widgetEnvironment(source);
      expect(environment.packages['commons/needs-selector@0.1.0']).toEqual(pkg);
    } finally {
      workspace.close();
    }
  });
});

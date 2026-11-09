import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { IDBFactory, IDBKeyRange } from 'fake-indexeddb';
import { createIndexedDbWorkspace } from '@patternverse/workspace';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import { widgetTemplate, needsStarters } from './templates';
import { plain } from './library';
const local = vi.hoisted(() => ({ workspace: undefined as unknown }));
vi.mock('$lib/client/workspace', () => ({
  getLocalWorkspace: () => Promise.resolve(local.workspace),
}));
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
function native(request: object) {
  return JSON.parse(editor(JSON.stringify(request)));
}
describe('local widget packages with the shipped Rust engine', () => {
  it('keeps the complete canonical catalogue separate from its 24 starting options', () => {
    const pkg = widgetTemplate('needs', 'owner/needs');
    native({ operation: 'validate_widget', package: pkg });
    const catalogue = JSON.parse(pkg.files['catalogue.json']);
    expect(catalogue.choices).toHaveLength(68);
    expect(Object.values(needsStarters).flat()).toHaveLength(24);
    expect(new Set(Object.values(needsStarters).flat()).size).toBe(24);
    expect(
      catalogue.presentation.groups.filter((g: { parent_ids: string[] }) => !g.parent_ids.length),
    ).toHaveLength(8);
    expect(
      catalogue.presentation.groups.filter((g: { parent_ids: string[] }) => g.parent_ids.length),
    ).toHaveLength(22);
    const interaction = native({
      operation: 'prepare_widget',
      package: pkg,
      export: 'needs',
      inputs: { initial_view: 'simple' },
    });
    expect(interaction.inputs.options.value).toHaveLength(68);
    const accepted = native({
      operation: 'validate_widget_output',
      interaction,
      outputs: { needs: [{ value: 'water', label: 'Fake' }] },
    });
    expect(plain(accepted)).toEqual({ needs: [{ value: 'water', label: 'Water' }] });
  });
  it('validates a generic authored record and rejects a forged preview contract', () => {
    const pkg = widgetTemplate('blank', 'owner/reflection', 'Reflection', 'reflection');
    const interaction = native({
      operation: 'prepare_widget',
      package: pkg,
      export: 'reflection',
      inputs: { energy: 6 },
    });
    const accepted = native({
      operation: 'validate_widget_output',
      interaction,
      outputs: { note: 'A reflection', energy: 6 },
    });
    expect(plain(accepted)).toEqual({ note: 'A reflection', energy: 6 });
    expect(() =>
      native({
        operation: 'validate_widget_output',
        interaction: {
          ...interaction,
          definition: { ...interaction.definition, outputs: { energy: { type: 'number' } } },
        },
        outputs: { energy: 6 },
      }),
    ).toThrow();
  });
  it('pins major imports on first editor resolution and starts from the same release after installing an upgrade', async () => {
    const workspace = createIndexedDbWorkspace({
      indexedDB: new IDBFactory(),
      IDBKeyRange,
      databaseName: crypto.randomUUID(),
    });
    local.workspace = workspace;
    const pkg = widgetTemplate('needs', 'owner/pinned', 'Pinned', 'pinned');
    pkg.manifest.version = '1.0.0';
    const d = await workspace.saveWidgetDraft({
      id: 'pinned',
      revision: 0,
      name: 'Pinned',
      description: '',
      package: pkg,
    });
    await workspace.saveWidgetRelease(d.id, d.revision);
    const { inspectSource } = await import('$lib/pattern-editor/bridge');
    const { startSourceRun, serializeSourceRun, restoreSourceRun } =
      await import('$lib/pattern-runtime/source');
    const source =
      ':language 1\n:import "personal/pinned@1" as ui\nselection = !widget ui.needs {\nSelect needs.\n}\n-> end';
    expect((await inspectSource(source + '\n')).structure).toBeTruthy();
    const newer = await workspace.saveWidgetDraft({
      ...d,
      package: { ...pkg, manifest: { ...pkg.manifest, version: '1.1.0' } },
    });
    await workspace.saveWidgetRelease(newer.id, newer.revision);
    const run = await startSourceRun(source);
    expect(
      (run.view.pending?.request.payload as { package: { manifest: { version: string } } }).package
        .manifest.version,
    ).toBe('1.0.0');
    expect(await restoreSourceRun(source, serializeSourceRun(run))).toEqual(run);
    workspace.close();
  });
});

it('restores a real accepted widget receipt from workspace backup without granting code execution', async () => {
  const workspace = createIndexedDbWorkspace({
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  local.workspace = workspace;
  const pkg = widgetTemplate('needs', 'owner/backup', 'Backup', 'backup');
  const d = await workspace.saveWidgetDraft({
    id: 'backup',
    revision: 0,
    name: 'Backup',
    description: '',
    package: pkg,
  });
  await workspace.saveWidgetRelease(d.id, d.revision);
  const { startSourceRun, applySourceAction, resumeSourceRun } =
    await import('$lib/pattern-runtime/source');
  const { practiceSnapshot } = await import('$lib/pattern-run/history');
  const source =
    ':language 1\n:import "personal/backup@0.1.0" as ui\nselection = !widget ui.needs {\nSelect needs.\n}\nreflection = !ask {\nSelected: {{selection.needs}}\n}\n-> end';
  let run = await startSourceRun(source);
  const effect = run.view.pending!;
  run = await applySourceAction(
    run,
    {
      Fulfill: {
        effect_id: effect.effect_id,
        result: {
          kind: 'widget',
          value: { needs: [{ value: 'water', label: 'Untrusted label' }] },
        },
      },
    },
    effect.run_id,
  );
  const saved = await workspace.savePracticeRun(
    practiceSnapshot(
      run,
      {
        patternRef: { sourceId: 'personal', entityId: 'backup-practice' },
        patternTitle: 'Backup practice',
        patternType: 'pattern',
        verseIds: [],
      },
      { resumable: true },
    ),
  );
  const { createWorkspaceBackup, encodeWorkspaceBackup, decodeWorkspaceBackup } =
    await import('@patternverse/workspace/backup');
  const backup = decodeWorkspaceBackup(
    encodeWorkspaceBackup(createWorkspaceBackup(await workspace.readWorkspaceData())),
  );
  const target = createIndexedDbWorkspace({
    indexedDB: new IDBFactory(),
    IDBKeyRange,
    databaseName: crypto.randomUUID(),
  });
  await target.replaceFromBackup(backup);
  expect(await target.widgetEnabled(pkg.identity)).toBe(false);
  const restored = await target.getPracticeRun(saved.id);
  const resumed = await resumeSourceRun(restored!.checkpoint!);
  expect(resumed).toEqual(run);
  expect(resumed.view.pending?.request.payload.prompt).toContain('Water');
  expect(restored!.responses[0].answer).toContain('Water');
  expect(restored!.responses[0].answer).not.toContain('Untrusted');
  workspace.close();
  target.close();
});

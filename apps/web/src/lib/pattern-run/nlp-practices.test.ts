// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import { parseMarkdownEntity } from '@patternverse/compiler';
import type { StandaloneRun } from '$lib/mira/guided';
import type { Inspection } from '$lib/pattern-editor/types';
import { hasStandaloneSourcePractice } from './source-practice';

const root = resolve(process.cwd(), '../..');
const records = (
  JSON.parse(
    readFileSync(resolve(root, 'docs/pattern-packages/sleight-of-mouth.json'), 'utf8'),
  ) as { patterns: { id: string; title: string }[] }
).patterns;
const sources = records.map((p) => {
  const parsed = parseMarkdownEntity(
    readFileSync(resolve(root, `content/patterns/${p.id}.md`), 'utf8'),
    { sourceId: 'commons', sourcePath: `patterns/${p.id}.md` },
  );
  return { ...p, entity: parsed.entity!, source: parsed.entity!.languagePracticeSource! };
});
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
function execute<T>(request: Record<string, unknown>): T {
  return JSON.parse(editor(JSON.stringify(request))) as T;
}
function advance(run: StandaloneRun, kind: string, value: string) {
  const pending = run.view.pending!;
  return execute<StandaloneRun>({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: {
      run_id: pending.run_id,
      event: { Fulfill: { effect_id: pending.effect_id, result: { kind, value } } },
    },
  });
}

describe('fourteen self-guided NLP Pattern Language exercises', () => {
  it('contains fourteen distinct canonical sources', () => {
    expect(sources).toHaveLength(14);
    expect(new Set(sources.map((p) => p.source)).size).toBe(14);
    expect(
      hasStandaloneSourcePractice({
        type: 'pattern',
        tags: ['method:cbt'],
        languagePracticeSource: ':language 1',
      }),
    ).toBe(true);
  });
  it.each(sources)('validates and completes $title without AI or dependencies', (p) => {
    expect(hasStandaloneSourcePractice(p.entity)).toBe(true);
    const inspection = execute<Inspection>({ operation: 'inspect', source: p.source });
    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.structure?.dependencies).toEqual({});
    expect(
      inspection.structure?.steps.filter((s) =>
        ['realize', 'generate', 'classify', 'use'].includes(s.kind),
      ),
    ).toEqual([]);
    let run = execute<StandaloneRun>({
      operation: 'start',
      source: p.source,
      root_id: p.id,
      inputs: {},
    });
    expect(run.view.pending?.request.kind).toBe('interaction.ask');
    for (let step = 1; step <= 6; step += 1) {
      expect(run.view.pending?.request.kind).toBe('interaction.ask');
      run = advance(run, 'text', `My note ${step}`);
    }
    expect(run.view.status).toBe('Completed');
    for (let step = 1; step <= 6; step += 1)
      expect(JSON.stringify(run.view)).toContain(`My note ${step}`);
    expect(p.source).toContain('not treatment');
  });
  it.each(sources)('allows leaving $title without answering', (p) => {
    const started = execute<StandaloneRun>({
      operation: 'start',
      source: p.source,
      root_id: `${p.id}-stop`,
      inputs: {},
    });
    const run = execute<StandaloneRun>({
      operation: 'apply',
      saved: started.saved,
      expected_revision: started.view.revision,
      command: { run_id: started.view.root_id, event: 'Cancel' },
    });
    expect(run.view.status).toBe('Cancelled');
    expect(run.view.pending).toBeNull();
  });
});

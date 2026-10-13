// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { StandaloneRun } from '$lib/mira/guided';
import type { Inspection } from '$lib/pattern-editor/types';
import { hasStandaloneSourcePractice } from './source-practice';
import { formBlocks } from './form';

const root = resolve(process.cwd(), '../..');
let corpus: CompiledCorpus;
let source: string;

beforeAll(async () => {
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  });
  corpus = await loadAndCompileCorpus(
    {
      manifestPath: resolve(root, 'patternverse.yaml'),
      contentDirectory: resolve(root, 'content'),
      readonly: true,
    },
    { includeDrafts: false },
  );
  source = corpus.entities.find(
    (entity) => entity.id === 'rewrite-the-nightmare',
  )!.languagePracticeSource!;
});

function execute<T>(request: Record<string, unknown>): T {
  return JSON.parse(editor(JSON.stringify(request))) as T;
}
function start() {
  return execute<StandaloneRun>({
    operation: 'start',
    source,
    root_id: 'nightmare-test',
    inputs: {},
  });
}
function action(run: StandaloneRun, event: unknown) {
  return execute<StandaloneRun>({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: { run_id: run.view.root_id, event },
  });
}
function reply(run: StandaloneRun, kind: string, value: unknown) {
  const pending = run.view.pending!;
  return action(run, {
    Fulfill: { effect_id: pending.effect_id, result: { kind, value } },
  });
}
function draft() {
  let run = start();
  for (const note of [
    'A locked corridor',
    'The last door',
    'It opens into a garden',
    'I step outside',
  ]) {
    expect(run.view.pending?.request.kind).toBe('interaction.ask');
    run = reply(run, 'text', note);
  }
  expect(JSON.stringify(run.view.pending?.request)).toContain('I step outside');
  expect(run.view.pending?.request.kind).toBe('interaction.form');
  return run;
}

describe('Rewrite the Nightmare', () => {
  it('belongs to Sleep and Nightmares in Therapy and retains the supplied article', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    const pattern = corpus.entities.find((entity) => entity.id === 'rewrite-the-nightmare')!;
    const collection = corpus.entities.find((entity) => entity.id === 'sleep-and-nightmares')!;
    const therapy = { sourceId: 'commons', entityId: 'therapy' };
    expect(pattern.verseMemberships).toContainEqual(therapy);
    expect(collection.verseMemberships).toContainEqual(therapy);
    expect(collection.collectionItems).toContainEqual({
      sourceId: 'commons',
      entityId: pattern.id,
    });
    expect(pattern.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: collection.id,
    });
    const metadata = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/sleep-and-nightmares.json'), 'utf8'),
    );
    const original = pattern.body.split('\n## Sources and scope')[0]!.trim();
    expect(createHash('sha256').update(original).digest('hex')).toBe(
      metadata.patterns[0].original_article_sha256,
    );
    expect(pattern.body).not.toContain('## Interactive practice');
    expect(hasStandaloneSourcePractice(pattern)).toBe(true);
    const inspection = execute<Inspection>({ operation: 'inspect', source });
    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.structure?.dependencies).toEqual({});
    expect(source).not.toMatch(/!agent|~\s*\{/);
  });

  it.each([60, 600, 1200])('completes rehearsal with an adjusted %s-second timer', (seconds) => {
    const drafted = draft();
    const blocks = formBlocks(drafted.view.pending!);
    expect(blocks.map((block) => block.type)).toEqual(['show', 'timer']);
    const timer = blocks.find((block) => block.type === 'timer')!;
    expect(timer.type === 'timer' && timer.timer).toEqual({
      duration_seconds: 600,
      adjustable: true,
      min_seconds: 60,
      max_seconds: 1200,
      blocking: true,
      sticky: false,
    });
    expect(JSON.stringify(drafted.view.pending?.request)).toContain('I step outside');
    const run = reply(drafted, 'form', {
      countdown: {
        type: 'record',
        value: {
          duration_seconds: { type: 'number', value: seconds },
          elapsed_seconds: { type: 'number', value: seconds },
          completed: { type: 'boolean', value: true },
        },
      },
    });
    expect(run.view.status).toBe('Completed');
    expect(run.view.outputs).toEqual({ outcome: { type: 'text', value: 'rehearsed' } });
    expect(run.view.pending).toBeNull();
  });

  it('can pause or end at rehearsal without needing a separate distress choice', () => {
    const drafted = draft();
    const paused = action(drafted, 'Pause');
    expect(paused.view.status).toBe('Paused');
    const resumed = action(paused, 'Resume');
    expect(resumed.view.pending?.request).toEqual(drafted.view.pending?.request);
    const cancelled = action(resumed, 'Cancel');
    expect(cancelled.view.status).toBe('Cancelled');
    expect(cancelled.view.outputs).toEqual({});
    expect(source).not.toContain('!choose');
  });

  it('can pause before disclosure, resume, and end without a success outcome', () => {
    const started = start();
    const paused = action(started, 'Pause');
    expect(paused.view.status).toBe('Paused');
    const resumed = action(paused, 'Resume');
    expect(resumed.view.pending?.request).toEqual(started.view.pending?.request);
    const cancelled = action(resumed, 'Cancel');
    expect(cancelled.view.status).toBe('Cancelled');
    expect(cancelled.view.outputs).toEqual({});
  });
});

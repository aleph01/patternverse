// @vitest-environment jsdom
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAndCompileCorpus, type CompiledCorpus } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { StandaloneRun } from '$lib/mira/guided';
import type { Inspection } from '$lib/pattern-editor/types';
import { formBlocks } from './form';
import { hasStandaloneSourcePractice } from './source-practice';

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
    (entity) => entity.id === 'double-standard-technique',
  )!.languagePracticeSource!;
});

function execute<T>(request: Record<string, unknown>): T {
  return JSON.parse(editor(JSON.stringify(request))) as T;
}
function start() {
  return execute<StandaloneRun>({
    operation: 'start',
    source,
    root_id: 'double-standard-test',
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
function submit(run: StandaloneRun, answers: Record<string, string>) {
  expect(run.view.pending?.request.kind).toBe('interaction.form');
  const asks = formBlocks(run.view.pending!).filter((block) => block.type === 'ask');
  expect(asks.every((block) => !block.required)).toBe(true);
  return action(run, {
    Fulfill: {
      effect_id: run.view.pending!.effect_id,
      result: {
        kind: 'form',
        value: Object.fromEntries(
          asks.map((block) => [block.id, { type: 'text', value: answers[block.id] ?? '' }]),
        ),
      },
    },
  });
}

describe('Double Standard Technique', () => {
  it('preserves the supplied article and belongs to CBT in Therapy', () => {
    expect(corpus.diagnostics).toEqual([]);
    expect(corpus.unresolvedReferences).toEqual([]);
    const pattern = corpus.entities.find((entity) => entity.id === 'double-standard-technique')!;
    const cbt = corpus.entities.find((entity) => entity.id === 'cbt')!;
    expect(cbt.collectionItems).toHaveLength(12);
    expect(cbt.collectionItems).toContainEqual({ sourceId: 'commons', entityId: pattern.id });
    expect(pattern.verseMemberships).toContainEqual({ sourceId: 'commons', entityId: 'therapy' });
    const metadata = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/double-standard-technique.json'), 'utf8'),
    );
    const article = pattern.body.split('\n## Sources and attribution')[0]!.trim();
    expect(createHash('sha256').update(article).digest('hex')).toBe(
      metadata.patterns[0].original_article_sha256,
    );
    expect(hasStandaloneSourcePractice(pattern)).toBe(true);
    const inspection = execute<Inspection>({ operation: 'inspect', source });
    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.structure?.dependencies).toEqual({});
    expect(source).not.toMatch(/!agent|~\s*\{/);
  });

  it('carries the situation and friend response through four grouped steps into the reflection', () => {
    let run = submit(start(), {
      situation: 'I needed rest.',
      thought: 'I am useless.',
      before: '80',
    });
    expect(JSON.stringify(formBlocks(run.view.pending!))).toContain('I needed rest.');
    expect(JSON.stringify(formBlocks(run.view.pending!))).toContain('I am useless.');
    run = submit(run, { response: 'Your capacity is limited right now.' });
    expect(JSON.stringify(formBlocks(run.view.pending!))).toContain(
      'Your capacity is limited right now.',
    );
    run = submit(run, { check: 'Resting does not establish worthlessness.', objection: '' });
    run = submit(run, { fair: 'My capacity is limited right now.', after: '80', next: 'Rest.' });
    expect(run.view.status).toBe('Completed');
    expect(run.view.outputs).toEqual({ outcome: { type: 'text', value: 'reflected' } });
    const reflection = run.view.items.find((item) => item.effect.request.kind === 'content.show')!;
    const text = JSON.stringify(reflection);
    for (const answer of [
      'I needed rest.',
      'I am useless.',
      'Your capacity is limited right now.',
      'Resting does not establish worthlessness.',
      'My capacity is limited right now.',
      'Rest.',
    ])
      expect(text).toContain(answer);
    expect(text).not.toContain('{{');
  });

  it('rewinds a completed form with a monotonic revision and refreshes downstream reflection', () => {
    const initial = start();
    const first = initial.view.pending!;
    let run = submit(initial, { situation: 'Old situation', thought: 'Old judgment' });
    const second = run.view.pending!;
    run = submit(run, { response: 'Old response' });
    run = submit(run, {});
    run = submit(run, {});
    const revision = run.view.revision;
    const reopened = execute<StandaloneRun>({
      operation: 'rewind',
      saved: run.saved,
      expected_revision: revision,
      run_id: first.run_id,
      effect_id: first.effect_id,
    });
    expect(reopened.view.revision).toBe(revision + 1);
    expect(reopened.view.pending).toEqual(first);
    expect(reopened.view.outputs).toEqual({});
    expect(reopened.view.items.every((item) => item.result === null)).toBe(true);
    expect(() =>
      execute({
        operation: 'rewind',
        saved: run.saved,
        expected_revision: revision - 1,
        run_id: first.run_id,
        effect_id: first.effect_id,
      }),
    ).toThrow(/PATTERN_CONFLICT/);
    expect(() =>
      execute({
        operation: 'rewind',
        saved: reopened.saved,
        expected_revision: reopened.view.revision,
        run_id: second.run_id,
        effect_id: second.effect_id,
      }),
    ).toThrow();
    run = submit(reopened, { situation: 'New situation', thought: 'New judgment' });
    expect(JSON.stringify(run.view.pending)).toContain('New judgment');
    expect(JSON.stringify(run.view.pending)).not.toContain('Old judgment');
    for (let step = 0; step < 3; step++) run = submit(run, {});
    expect(run.view.status).toBe('Completed');
    expect(JSON.stringify(run.view.items)).toContain('New situation');
    expect(JSON.stringify(run.view.items)).not.toContain('Old response');
    const restored = execute<StandaloneRun>({ operation: 'restore', source, saved: run.saved });
    expect(restored.view).toEqual(run.view);
  });

  it('permits skipping every question without inventing a response or a score', () => {
    let run = start();
    for (let step = 0; step < 4; step++) run = submit(run, {});
    expect(run.view.status).toBe('Completed');
    expect(
      run.view.items.filter((item) => item.effect.request.kind === 'interaction.form'),
    ).toHaveLength(4);
  });

  it('permits pausing, resuming, and ending without an outcome', () => {
    const initial = start();
    const paused = action(initial, 'Pause');
    expect(paused.view.status).toBe('Paused');
    const resumed = action(paused, 'Resume');
    expect(resumed.view.pending?.request).toEqual(initial.view.pending?.request);
    const cancelled = action(resumed, 'Cancel');
    expect(cancelled.view.status).toBe('Cancelled');
    expect(cancelled.view.outputs).toEqual({});
  });
});

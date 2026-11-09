// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import { initSync, editor } from '$lib/mira/engine/pattern_wasm.js';
import type { Inspection } from '$lib/pattern-editor/types';
import type { PatternRun } from './types';

const source = parseMarkdownEntity(
  readFileSync(resolve(process.cwd(), '../../content/patterns/meta-model.md'), 'utf8'),
  { sourceId: 'commons', sourcePath: 'patterns/meta-model.md' },
).entity!.languagePracticeSource!;
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
function execute<T>(request: Record<string, unknown>): T {
  return JSON.parse(editor(JSON.stringify(request))) as T;
}
function start() {
  return execute<PatternRun>({
    operation: 'start',
    source,
    root_id: 'meta-model-test',
    inputs: {},
  });
}
function answer(run: PatternRun, kind: string, value: string) {
  const pending = run.view.pending!;
  return execute<PatternRun>({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: {
      run_id: pending.run_id,
      event: { Fulfill: { effect_id: pending.effect_id, result: { kind, value } } },
    },
  });
}

describe('Meta Model practice through the shipped Pattern Language engine', () => {
  it('validates without AI or imported dependencies', () => {
    const inspection = execute<Inspection>({ operation: 'inspect', source });
    expect(inspection.diagnostics).toEqual([]);
    expect(inspection.structure?.dependencies).toEqual({});
    expect(
      inspection.structure?.steps.filter((s) =>
        ['realize', 'generate', 'classify', 'use'].includes(s.kind),
      ),
    ).toEqual([]);
  });

  it.each([
    ['deletion', 'people', 'Who or what specifically am I referring to?'],
    ['deletion', 'actions', 'What did someone actually say or do?'],
    ['deletion', 'comparison', 'Compared with what, and in what respect?'],
    ['generalization', 'scope', 'In which situations does this happen, and are any different?'],
    ['generalization', 'obstacle', 'What makes this difficult or impossible?'],
    ['generalization', 'requirement', "What requires this, and what happens if I don't do it?"],
    ['distortion', 'evidence', 'What did I observe, and what am I assuming it means?'],
    ['distortion', 'connection', 'How does one thing lead to the other in this situation?'],
    ['distortion', 'meaning', 'What would this word or judgment look like in concrete actions?'],
    ['unsure', 'incident', 'What happened most recently?'],
  ])('answers the %s / %s question directly', (route, choice, question) => {
    let run = answer(start(), 'text', 'Everyone rejects my proposals.');
    expect(JSON.stringify(run.view.pending)).toContain('What matters to you in this situation?');
    expect(JSON.stringify(run.view.pending)).toContain('Everyone rejects my proposals.');
    expect(JSON.stringify(run.view.pending)).toContain('I want my input to be heard.');
    const concern = 'I want my proposals to receive a response.';
    run = answer(run, 'text', concern);
    expect(run.view.pending?.request.kind).toBe('interaction.choose');
    run = answer(run, 'selected', route);
    expect(run.view.pending?.request.kind).toBe('interaction.choose');
    run = answer(run, 'selected', choice);
    expect(run.view.pending?.request.kind).toBe('interaction.ask');
    expect(JSON.stringify(run.view.pending)).toContain(question);
    for (const text of ['Jo moved to the next item.', 'One proposal was passed over yesterday.']) {
      expect(run.view.pending?.request.kind).toBe('interaction.ask');
      run = answer(run, 'text', text);
    }
    expect(run.view.pending?.request.kind).toBe('interaction.choose');
    run = answer(run, 'selected', 'finish');
    expect(run.view.status).toBe('Completed');
    expect(JSON.stringify(run.view)).toContain('Everyone rejects my proposals.');
    expect(JSON.stringify(run.view)).toContain(concern);
    expect(JSON.stringify(run.view)).toContain(question);
    expect(JSON.stringify(run.view)).toContain('One proposal was passed over yesterday.');
    expect(JSON.stringify(run.view)).toContain('No action chosen.');
  });

  it.each(['deletion', 'generalization', 'distortion', 'unsure'])(
    'allows a custom question on the %s route',
    (route) => {
      let run = answer(start(), 'text', 'They never listen.');
      run = answer(run, 'text', 'I want a response to my idea.');
      run = answer(run, 'selected', route);
      run = answer(run, 'selected', 'custom');
      expect(JSON.stringify(run.view.pending)).toContain('Write one question you want to explore');
      run = answer(run, 'text', 'What would a useful response look like?');
      expect(JSON.stringify(run.view.pending)).toContain('What would a useful response look like?');
      run = answer(run, 'text', 'A question or an explanation.');
      run = answer(run, 'text', 'I need a response, even when my idea is rejected.');
      run = answer(run, 'selected', 'finish');
      expect(run.view.status).toBe('Completed');
      expect(JSON.stringify(run.view)).toContain('What would a useful response look like?');
    },
  );

  it('keeps a next step when the participant chooses to write one', () => {
    let run = answer(start(), 'text', 'They never listen.');
    run = answer(run, 'text', 'My idea was passed over.');
    run = answer(run, 'selected', 'deletion');
    run = answer(run, 'selected', 'people');
    for (const text of ['Jo moved to the next item.', 'Jo did not respond yesterday.'])
      run = answer(run, 'text', text);
    run = answer(run, 'selected', 'write');
    expect(run.view.pending?.request.kind).toBe('interaction.ask');
    run = answer(run, 'text', 'Ask Jo for a response.');
    expect(run.view.status).toBe('Completed');
    expect(JSON.stringify(run.view)).toContain('Ask Jo for a response.');
  });

  it('offers substantive starting points without a redundant exit choice', () => {
    let run = answer(start(), 'text', 'My original concern.');
    run = answer(run, 'text', 'The impact matters.');
    expect(run.view.pending?.request.kind).toBe('interaction.choose');
    expect(JSON.stringify(run.view.pending)).not.toContain('Leave the practice here');
    run = answer(run, 'selected', 'unsure');
    expect(JSON.stringify(run.view.pending)).toContain('Start with one recent situation');
  });

  it('can be cancelled before providing any answers', () => {
    const run = start();
    const cancelled = execute<PatternRun>({
      operation: 'apply',
      saved: run.saved,
      expected_revision: run.view.revision,
      command: { run_id: run.view.root_id, event: 'Cancel' },
    });
    expect(cancelled.view.status).toBe('Cancelled');
    expect(cancelled.view.pending).toBeNull();
  });
});

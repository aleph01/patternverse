import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { formBlocks, type FormAnswers } from '$lib/pattern-run/form';
import type { PatternRun } from './types';
import { startSourceRun, applySourceAction, serializeSourceRun, restoreSourceRun } from './source';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

const source = parseLanguagePracticeFromBody(
  readFileSync(
    resolve(
      process.cwd(),
      '../../content/patterns/define-the-decision-before-comparing-options.md',
    ),
    'utf8',
  ),
).source!;

function formAction(run: PatternRun, empty = false) {
  const effect = run.view.pending!;
  const value: FormAnswers = Object.fromEntries(
    formBlocks(effect).flatMap((block) =>
      block.type === 'ask'
        ? [[block.id, { type: 'text', value: empty ? '' : `Response for ${block.id}` }]]
        : [],
    ),
  );
  return { Fulfill: { effect_id: effect.effect_id, result: { kind: 'form', value } } };
}

describe('neutral source runtime and explicit checkpoint handoff', () => {
  it('uses the shipped Rust runtime for validation and leaves rejected runs unchanged', async () => {
    const run = await startSourceRun(source);
    const before = serializeSourceRun(run);
    await expect(
      applySourceAction(run, formAction(run, true), run.view.pending!.run_id),
    ).rejects.toBeDefined();
    expect(serializeSourceRun(run)).toBe(before);
    const next = await applySourceAction(run, formAction(run), run.view.pending!.run_id);
    expect(next.view.revision).toBe(1);
    await expect(
      applySourceAction({ ...run, saved: next.saved }, formAction(run), run.view.pending!.run_id),
    ).rejects.toBeDefined();
  });

  it('continues the real public worksheet with identical history, transitions and outputs after handoff', async () => {
    let uninterrupted = await startSourceRun(source);
    let transferred = await restoreSourceRun(source, serializeSourceRun(uninterrupted));
    let steps = 0;
    while (uninterrupted.view.pending) {
      const effect = uninterrupted.view.pending;
      expect(effect.request.kind).toBe('interaction.form');
      const event = formAction(uninterrupted);
      uninterrupted = await applySourceAction(uninterrupted, event, effect.run_id);
      transferred = await applySourceAction(transferred, event, effect.run_id);
      transferred = await restoreSourceRun(source, serializeSourceRun(transferred));
      expect(transferred).toEqual(uninterrupted);
      if (++steps > 20) throw new Error('Unexpected practice loop');
    }
    expect(steps).toBe(5);
    expect(transferred.view.status).toBe('Completed');
    expect(transferred.view.outputs).toEqual(uninterrupted.view.outputs);
  });

  it('keeps typed outputs after restoration, and rejects corrupted or mismatched checkpoints', async () => {
    const program =
      ':language 1\n:output result\nresult = !form {\n!ask note {\nA note?\n}\n}\n-> end';
    const run = await startSourceRun(program);
    const checkpoint = serializeSourceRun(run);
    const restored = await restoreSourceRun(program, checkpoint);
    const finished = await applySourceAction(
      restored,
      formAction(restored),
      restored.view.pending!.run_id,
    );
    expect(finished.view.outputs).toEqual({
      result: { type: 'record', value: { note: { type: 'text', value: 'Response for note' } } },
    });
    await expect(restoreSourceRun(source, checkpoint)).rejects.toBeDefined();
    await expect(restoreSourceRun(program, JSON.stringify({}))).rejects.toBeDefined();
    const invalid = JSON.parse(checkpoint);
    invalid.manager.limits.max_runs = 10000;
    await expect(restoreSourceRun(program, JSON.stringify(invalid))).rejects.toBeDefined();
    await expect(restoreSourceRun(program, ' '.repeat(2 * 1024 * 1024 + 1))).rejects.toThrow(
      'too large',
    );
  });
});

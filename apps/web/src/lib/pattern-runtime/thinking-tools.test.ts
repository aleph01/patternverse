import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import { formBlocks, type FormAnswers } from '$lib/pattern-run/form';
import { optionsFor } from '$lib/pattern-run/view';
import type { PatternEffect, PatternRun } from './types';
import { startSourceRun, applySourceAction, restoreSourceRun, serializeSourceRun } from './source';

const root = resolve(process.cwd(), '../..');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/thinking-tools.json'), 'utf8'),
) as { patterns: { id: string }[] };
const sourceFor = (id: string) =>
  parseLanguagePracticeFromBody(readFileSync(resolve(root, `content/patterns/${id}.md`), 'utf8'))
    .source!;
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

type AnswerOverride = (effect: PatternEffect, values: FormAnswers, index: number) => void;
function answers(effect: PatternEffect, index: number): FormAnswers {
  const values: FormAnswers = {};
  for (const b of formBlocks(effect)) {
    if (b.type === 'ask')
      values[b.id] = {
        type: 'text',
        value: !b.required && index === 0 ? '' : `Example ${index}: ${b.id}`,
      };
    if (b.type === 'rate') values[b.id] = { type: 'number', value: b.rating.min };
    if (b.type === 'select') {
      const option = b.options[index % b.options.length];
      values[b.id] =
        b.selection.mode === 'single'
          ? { type: 'choice', value: option }
          : {
              type: 'list',
              value: {
                element_type: 'choice',
                items: b.options
                  .slice(0, b.selection.min)
                  .map((value) => ({ type: 'choice', value })),
              },
            };
    }
  }
  return values;
}
async function fulfill(run: PatternRun, result: unknown) {
  const effect = run.view.pending!;
  return applySourceAction(
    run,
    { Fulfill: { effect_id: effect.effect_id, result } },
    effect.run_id,
  );
}
async function complete(id: string, count: number, override?: AnswerOverride) {
  const source = sourceFor(id);
  let run = await startSourceRun(source);
  const continuations = new Map<string, number>();
  let forms = 0;
  for (let step = 0; run.view.pending && step < 100; step++) {
    const e = run.view.pending;
    if (e.request.kind === 'interaction.form') {
      const values = answers(e, forms++);
      override?.(e, values, forms);
      run = await fulfill(run, { kind: 'form', value: values });
    } else if (e.request.kind === 'interaction.choose') {
      const options = optionsFor(e);
      expect(options.map((o) => o.value)).toEqual(['add', 'finish']);
      const key = String(e.node_id);
      const seen = (continuations.get(key) ?? 0) + 1;
      continuations.set(key, seen);
      run = await fulfill(run, { kind: 'selected', value: seen < count ? 'add' : 'finish' });
    } else if (e.request.kind === 'interaction.select') {
      run = await fulfill(run, {
        kind: 'ranked',
        value: optionsFor(e)
          .map((o) => o.value)
          .reverse(),
      });
    } else
      throw new Error(`Unhandled ${id}: ${e.request.kind} ${JSON.stringify(e.request.payload)}`);
  }
  expect(run.view.status).toBe('Completed');
  expect(run.view.outputs.result).toMatchObject({ type: 'record' });
  expect(await restoreSourceRun(source, serializeSourceRun(run))).toEqual(run);
  return run;
}

describe('Thinking Tools actual public practices through the shipped engine', () => {
  it.each(metadata.patterns)(
    'completes $id with multiple records and replayable typed output',
    async ({ id }) => {
      await complete(id, 2);
    },
  );
  it('lets participants leave the feelings pass blank', async () => {
    const run = await complete('six-thinking-hats', 1, (effect, values) => {
      if (effect.request.payload.title === 'Feelings') values.notes = { type: 'text', value: '' };
    });
    expect(run.view.outputs.result).toMatchObject({
      value: { feelings: { value: { notes: { type: 'text', value: '' } } } },
    });
  });
  it('calculates the worked decision comparison and a genuine sensitivity tie', async () => {
    const run = await complete('decision-matrix', 1, (e, v) => {
      const title = String(e.request.payload.title);
      const scores =
        title === 'Set relative weights'
          ? [3, 4, 2]
          : title === 'Assess option A'
            ? [4, 3, 5]
            : title === 'Assess option B'
              ? [2, 5, 3]
              : title === 'Test a plausible alternative weighting'
                ? [3, 5, 2]
                : null;
      if (scores)
        for (const [i, key] of ['one', 'two', 'three'].entries())
          v[key] = { type: 'number', value: scores[i] };
    });
    expect(run.view.outputs.result).toMatchObject({
      type: 'record',
      value: {
        baseline: {
          type: 'record',
          value: { a: { type: 'number', value: 34 }, b: { type: 'number', value: 32 } },
        },
        sensitivity: {
          type: 'record',
          value: { a: { type: 'number', value: 37 }, b: { type: 'number', value: 37 } },
        },
      },
    });
  });
  it('keeps a mixed initiative form pending on bad numbers and semantic choices, then ranks whole records', async () => {
    let run = await startSourceRun(sourceFor('impact-effort-matrix'));
    run = await fulfill(run, { kind: 'form', value: answers(run.view.pending!, 0) });
    const e = run.view.pending!;
    const values = answers(e, 1);
    const before = serializeSourceRun(run);
    for (const invalid of [
      { ...values, impact: { type: 'number', value: 6 } },
      { ...values, evidence: { type: 'choice', value: { value: 'invented', label: 'Invented' } } },
      { ...values, name: { type: 'text', value: '' } },
    ]) {
      await expect(fulfill(run, { kind: 'form', value: invalid })).rejects.toBeDefined();
      expect(serializeSourceRun(run)).toBe(before);
    }
    run = await fulfill(run, { kind: 'form', value: values });
    expect(run.view.pending!.request.kind).toBe('interaction.choose');
    const done = await complete('impact-effort-matrix', 2);
    const result = done.view.outputs.result as {
      value: {
        initiatives: { value: { items: unknown[] } };
        priorities: { value: { items: unknown[] } };
      };
    };
    expect(result.value.priorities.value.items).toEqual(
      [...result.value.initiatives.value.items].reverse(),
    );
  });
  it('keeps Cynefin choices participant-led across all five response approaches', async () => {
    for (const approach of ['clear', 'complicated', 'complex', 'chaotic', 'differentiate']) {
      const done = await complete('cynefin-framework', 1, (e, v) => {
        const b = formBlocks(e).find((b) => b.type === 'select' && b.id === 'approach');
        if (b?.type === 'select')
          v.approach = { type: 'choice', value: b.options.find((o) => o.value === approach)! };
      });
      expect(JSON.stringify(done.view.outputs)).toContain(`"value":"${approach}"`);
    }
  });
});

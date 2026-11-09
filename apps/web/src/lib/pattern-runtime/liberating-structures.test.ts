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
  readFileSync(resolve(root, 'docs/pattern-packages/liberating-structures.json'), 'utf8'),
) as {
  patterns: { source_number: number; id: string; practice: { path: string } }[];
};
const sourceFor = (number: number) => {
  const entry = metadata.patterns.find((p) => p.source_number === number)!;
  const parsed = parseLanguagePracticeFromBody(
    readFileSync(resolve(root, entry.practice.path), 'utf8'),
  );
  expect(parsed.errors).toEqual([]);
  return parsed.source!;
};
beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);

function answers(effect: PatternEffect, blankOptional = true): FormAnswers {
  const values: FormAnswers = {};
  for (const b of formBlocks(effect)) {
    if (b.type === 'ask')
      values[b.id] = {
        type: 'text',
        value: b.required || !blankOptional ? `Participant supplied: ${b.id}` : '',
      };
    if (b.type === 'rate') values[b.id] = { type: 'number', value: b.rating.min };
    if (b.type === 'select')
      values[b.id] =
        b.selection.mode === 'single'
          ? { type: 'choice', value: b.options[0] }
          : {
              type: 'list',
              value: {
                element_type: 'choice',
                items: b.options
                  .slice(0, b.selection.min)
                  .map((value) => ({ type: 'choice', value })),
              },
            };
    if (b.type === 'timer')
      values[b.id] = {
        type: 'record',
        value: {
          duration_seconds: { type: 'number', value: b.timer.duration_seconds },
          elapsed_seconds: { type: 'number', value: 0 },
          completed: { type: 'boolean', value: false },
        },
      };
  }
  return values;
}
async function fulfill(run: PatternRun, result: unknown) {
  const e = run.view.pending!;
  return applySourceAction(run, { Fulfill: { effect_id: e.effect_id, result } }, e.run_id);
}
async function complete(
  number: number,
  activity = 'performed',
  records = 2,
  override?: (e: PatternEffect, v: FormAnswers) => void,
) {
  const source = sourceFor(number);
  let run = await startSourceRun(source);
  const continuations = new Map<string, number>();
  for (let step = 0; run.view.pending && step < 200; step++) {
    const e = run.view.pending;
    if (e.request.kind === 'interaction.form') {
      const v = answers(e);
      override?.(e, v);
      run = await fulfill(run, { kind: 'form', value: v });
    } else if (e.request.kind === 'interaction.choose') {
      const opts = optionsFor(e).map((o) => o.value);
      if (opts.includes('add') && opts.includes('finish')) {
        const key = String(e.node_id),
          seen = (continuations.get(key) || 0) + 1;
        continuations.set(key, seen);
        run = await fulfill(run, { kind: 'selected', value: seen < records ? 'add' : 'finish' });
      } else {
        expect(opts).toContain(activity);
        run = await fulfill(run, { kind: 'selected', value: activity });
      }
    } else if (e.request.kind === 'interaction.timer') {
      const timer = e.request.payload.timer as { duration_seconds: number };
      run = await fulfill(run, {
        kind: 'timer',
        value: { duration_seconds: timer.duration_seconds, elapsed_seconds: 0, completed: false },
      });
    } else throw new Error(`Unexpected ${number} interaction ${e.request.kind}`);
  }
  expect(run.view.status).toBe('Completed');
  expect(run.view.outputs.result).toMatchObject({ type: 'record' });
  expect(await restoreSourceRun(source, serializeSourceRun(run))).toEqual(run);
  return run;
}

describe('Selected Liberating Structures through the shipped Rust engine', () => {
  it.each(metadata.patterns)('completes and restores #$source_number $id', async (p) => {
    await complete(p.source_number);
  });
  for (const activity of ['planned', 'passed']) {
    it.each([1, 11, 12, 13, 15, 20, 25, 36])(
      `does not invent results for ${activity} activity #%i`,
      async (number) => {
        const run = await complete(number, activity);
        const output = JSON.stringify(run.view.outputs.result);
        expect(output).toContain(`"value":"${activity}"`);
        expect(
          run.view.items.some((item) =>
            String(item.effect.request.payload.title || '').match(
              /Reflect on an actual exchange|Learn from the stations|Select the client|Compare actual attempts|Record selected discoveries|Debrief actual sessions|Reflect on an actual encounter/,
            ),
          ),
        ).toBe(false);
        if (number === 12) expect(output).toContain('"items":[]');
      },
    );
  }
  it('keeps STAR dimensions separate and rejects invalid mixed profiles atomically', async () => {
    let run = await startSourceRun(sourceFor(26));
    run = await fulfill(run, { kind: 'form', value: answers(run.view.pending!) });
    const before = serializeSourceRun(run),
      v = answers(run.view.pending!);
    for (const bad of [
      { ...v, tuning: { type: 'number', value: 6 } },
      { ...v, action: { type: 'number', value: 0 } },
      { ...v, reason_example: { type: 'text', value: '   ' } },
    ]) {
      await expect(fulfill(run, { kind: 'form', value: bad })).rejects.toBeDefined();
      expect(serializeSourceRun(run)).toBe(before);
    }
    const result = await complete(26, 'performed', 2, (_e, v) => {
      for (const key of ['separateness', 'tuning', 'action', 'reason'])
        if (v[key]) v[key] = { type: 'number', value: 4 };
    });
    expect(JSON.stringify(result.view.outputs)).not.toContain('total');
  });
  it('validates human-supplied card totals and retains multiple complete cards', async () => {
    let run = await startSourceRun(sourceFor(12));
    run = await fulfill(run, { kind: 'form', value: answers(run.view.pending!) });
    const timer = run.view.pending!.request.payload.timer as { duration_seconds: number };
    run = await fulfill(run, {
      kind: 'timer',
      value: { duration_seconds: timer.duration_seconds, elapsed_seconds: 0, completed: false },
    });
    run = await fulfill(run, { kind: 'selected', value: 'performed' });
    run = await fulfill(run, { kind: 'selected', value: 'add' });
    const before = serializeSourceRun(run);
    const value = answers(run.view.pending!);
    for (const invalid of [
      { ...value, total: { type: 'number', value: 26 } },
      { ...value, total: { type: 'number', value: 4 } },
      { ...value, idea: { type: 'text', value: ' ' } },
    ]) {
      await expect(fulfill(run, { kind: 'form', value: invalid })).rejects.toBeDefined();
      expect(serializeSourceRun(run)).toBe(before);
    }
    const done = await complete(12, 'performed', 3);
    const result = done.view.outputs.result as {
      value: { recorded_cards: { value: { items: unknown[] } } };
    };
    expect(result.value.recorded_cards.value.items).toHaveLength(2);
  });
  it('rejects unknown requirement decisions and preserves the pending record', async () => {
    let run = await startSourceRun(sourceFor(14));
    run = await fulfill(run, { kind: 'form', value: answers(run.view.pending!) });
    const before = serializeSourceRun(run),
      v = answers(run.view.pending!);
    await expect(
      fulfill(run, {
        kind: 'form',
        value: {
          ...v,
          decision: { type: 'choice', value: { value: 'invented', label: 'Delete everything' } },
        },
      }),
    ).rejects.toBeDefined();
    expect(serializeSourceRun(run)).toBe(before);
  });
  it('allows every spiral quadrant to stay private and excludes timer receipts from selected insights', async () => {
    const run = await complete(35);
    const result = run.view.outputs.result as {
      value: { chosen_insights: { value: { items: { value: Record<string, unknown> }[] } } };
    };
    const items = result.value.chosen_insights.value.items;
    expect(items).toHaveLength(4);
    for (const item of items) {
      expect(Object.keys(item.value).sort()).toEqual(['prompt', 'selected']);
      expect(item.value.selected).toEqual({ type: 'text', value: '' });
    }
  });
  it('retains a pending interview-sharing permission without assuming consent', async () => {
    const run = await complete(3, 'performed', 2, (e, v) => {
      const permission = formBlocks(e).find((b) => b.type === 'select' && b.id === 'permission');
      if (permission?.type === 'select')
        v.permission = {
          type: 'choice',
          value: permission.options.find((o) => o.value === 'not_asked')!,
        };
    });
    expect(JSON.stringify(run.view.outputs)).toContain('not_asked');
  });
});

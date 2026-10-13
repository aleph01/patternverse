import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { parseLanguagePracticeFromBody } from '@patternverse/compiler/practice';
import { initSync } from '$lib/mira/engine/pattern_wasm.js';
import {
  startSourceRun,
  applySourceAction,
  rewindSourceRun,
  restoreSourceRun,
  serializeSourceRun,
} from '$lib/pattern-runtime/source';
import type { PatternRun } from '$lib/pattern-runtime/types';
import { formBlocks } from './form';
import { saveRevisitedStep, sameAnswer } from './revisit';

beforeAll(() =>
  initSync({
    module: readFileSync(resolve(process.cwd(), 'src/lib/mira/engine/pattern_wasm_bg.wasm')),
  }),
);
async function fulfill(run: PatternRun, result: unknown) {
  const effect = run.view.pending!;
  return applySourceAction(
    run,
    { Fulfill: { effect_id: effect.effect_id, result } },
    effect.run_id,
  );
}
function formResult(run: PatternRun, text: string) {
  return {
    kind: 'form',
    value: Object.fromEntries(
      formBlocks(run.view.pending!).flatMap((block) =>
        block.type === 'ask' ? [[block.id, { type: 'text', value: `${text}: ${block.id}` }]] : [],
      ),
    ),
  };
}
const simple =
  ':language 1\n!ask first {\nFirst answer\n}\n!ask second {\nAfter {{first}}\n}\n!show {\n{{first}} / {{second}}\n}\n-> end';

describe('editing answers in place with the shipped runtime', () => {
  it('keeps all four grouped answers, refreshes their instructions and reflection, and saves a replay-valid checkpoint', async () => {
    const source = parseLanguagePracticeFromBody(
      readFileSync(
        resolve(process.cwd(), '../../content/patterns/double-standard-technique.md'),
        'utf8',
      ),
    ).source!;
    const first = await startSourceRun(source);
    let original = first;
    for (let i = 0; i < 4; i++)
      original = await fulfill(original, formResult(original, `Original ${i}`));
    const reopened = await rewindSourceRun(original, first.view.pending!);
    const saved = await saveRevisitedStep(
      original,
      reopened,
      formResult(reopened, 'Updated'),
      applySourceAction,
    );
    expect(saved.run.view.status).toBe('Completed');
    expect(saved.retained).toEqual([]);
    expect(saved.reviewIds).toHaveLength(3);
    const forms = saved.run.view.items.filter(
      ({ effect }) => effect.request.kind === 'interaction.form',
    );
    expect(forms).toHaveLength(4);
    for (let i = 1; i < 4; i++) expect(JSON.stringify(forms[i]!.result)).toContain(`Original ${i}`);
    const summary = saved.run.view.items.find(
      ({ effect }) => effect.request.kind === 'content.show',
    )!;
    expect(JSON.stringify(summary)).toContain('Updated: situation');
    expect(JSON.stringify(summary)).not.toContain('Original 0');
    expect(JSON.stringify(forms[1]!.effect)).toContain('Updated: thought');
    expect(await restoreSourceRun(source, serializeSourceRun(saved.run))).toEqual(saved.run);
    expect(original.view.status).toBe('Completed');
    expect(JSON.stringify(original.view.items)).toContain('Original 0');
  });

  it('retains later answers without fulfilling a timer automatically', async () => {
    const source =
      ':language 1\n!ask first {\nFirst\n}\n!timer pause {\n:duration 60\n:blocking true\nPause\n}\n!ask last {\nLast\n}\n-> end';
    const initial = await startSourceRun(source);
    let original = await fulfill(initial, { kind: 'text', value: 'Before' });
    original = await fulfill(original, {
      kind: 'timer',
      value: { duration_seconds: 60, elapsed_seconds: 60, completed: true },
    });
    original = await fulfill(original, { kind: 'text', value: 'Later answer kept' });
    const saved = await saveRevisitedStep(
      original,
      await rewindSourceRun(original, initial.view.pending!),
      { kind: 'text', value: 'After' },
      applySourceAction,
    );
    expect(saved.run.view.pending?.request.kind).toBe('interaction.timer');
    expect(saved.retained).toHaveLength(2);
    expect(saved.retained[1]!.answer).toBe('Later answer kept');
  });

  it('leaves changed model work pending and retains participant answers without redispatching old model results', async () => {
    const source =
      ':language 1\n!ask first {\nFirst\n}\n!agent generated {\n:returns text\nGenerate for {{first}}\n}\n!ask last {\nReply to {{generated}}\n}\n-> end';
    const initial = await startSourceRun(source);
    let original = await fulfill(initial, { kind: 'text', value: 'Before' });
    original = await fulfill(original, {
      kind: 'generated',
      value: { type: 'text', value: 'Old model response' },
    });
    original = await fulfill(original, { kind: 'text', value: 'My later answer' });
    const saved = await saveRevisitedStep(
      original,
      await rewindSourceRun(original, initial.view.pending!),
      { kind: 'text', value: 'After' },
      applySourceAction,
    );
    expect(saved.run.view.pending?.request.kind).toBe('agent.generate');
    expect(saved.retained.map(({ answer }) => answer)).toEqual(['My later answer']);
    expect(JSON.stringify(saved.run.view.items)).not.toContain('Old model response');
  });

  it('keeps an old branch answer separate from a new question with the same effect counter', async () => {
    const source =
      ':language 1\n!choose route {\n:option a "A"\n:option b "B"\nChoose a path\n}\n?branch {\n:when route.value == "a" -> a\n:else -> b\n}\na:\n!ask first {\nQuestion on path A\n}\n-> end\nb:\n!ask second {\nDifferent question on path B\n}\n-> end';
    const initial = await startSourceRun(source);
    let original = await fulfill(initial, { kind: 'selected', value: 'a' });
    const oldQuestion = original.view.pending!;
    original = await fulfill(original, { kind: 'text', value: 'Only an answer to A' });
    const saved = await saveRevisitedStep(
      original,
      await rewindSourceRun(original, initial.view.pending!),
      { kind: 'selected', value: 'b' },
      applySourceAction,
    );
    expect(saved.run.view.pending!.effect_id).toBe(oldQuestion.effect_id);
    expect(saved.run.view.pending!.node_id).not.toBe(oldQuestion.node_id);
    expect(saved.run.view.pending!.request.payload.prompt).toBe('Different question on path B');
    expect(saved.run.view.pending!.request.kind).toBe('interaction.ask');
    expect(saved.retained.map(({ answer }) => answer)).toEqual(['Only an answer to A']);
    expect(saved.run.view.status).toBe('Waiting');
  });

  it('keeps an answer visible when Rust rejects it against the revised step', async () => {
    const initial = await startSourceRun(simple);
    let original = await fulfill(initial, { kind: 'text', value: 'Before' });
    original = await fulfill(original, { kind: 'text', value: 'Later' });
    let calls = 0;
    const saved = await saveRevisitedStep(
      original,
      await rewindSourceRun(original, initial.view.pending!),
      { kind: 'text', value: 'After' },
      async (run, event, id) => {
        if (++calls > 1) throw new Error('PATTERN_COMMAND_REJECTED');
        return applySourceAction(run, event, id);
      },
    );
    expect(saved.run.view.pending?.request.payload.prompt).toBe('After After');
    expect(saved.retained.map(({ answer }) => answer)).toEqual(['Later']);
  });

  it('compares form answers without treating object order as an edit, while preserving ranking order', () => {
    expect(sameAnswer({ value: { a: 'one', b: 'two' } }, { value: { b: 'two', a: 'one' } })).toBe(
      true,
    );
    expect(sameAnswer(['a', 'b'], ['b', 'a'])).toBe(false);
  });
});

import type { PatternEffect, PatternRun } from '$lib/pattern-runtime/types';
import { worksheetSteps, type CompletedStep } from './view';

export type RetainedStep = CompletedStep & { number: number; result: unknown };
export type AdvanceRun = (run: PatternRun, event: unknown, runId: string) => Promise<PatternRun>;

/** Compare typed answers independently of a form record's property order. */
export function sameAnswer(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (!left || !right || typeof left !== 'object' || typeof right !== 'object') return false;
  if (Array.isArray(left) || Array.isArray(right))
    return (
      Array.isArray(left) &&
      Array.isArray(right) &&
      left.length === right.length &&
      left.every((value, index) => sameAnswer(value, right[index]))
    );
  const a = left as Record<string, unknown>,
    b = right as Record<string, unknown>;
  return (
    Object.keys(a).length === Object.keys(b).length &&
    Object.keys(a).every((key) => Object.hasOwn(b, key) && sameAnswer(a[key], b[key]))
  );
}

/** Effect counters alone can be reused by another branch; include source/loop provenance. */
export function executionStepKey(effect: PatternEffect): string {
  return JSON.stringify([
    effect.run_id,
    effect.effect_id,
    effect.node_id,
    effect.loop_context?.node_id,
    effect.loop_context?.iteration,
  ]);
}

/** Submit through Rust, then carry forward answers only along the same validated path.
 * Model work and timers require an explicit interaction; they are never redispatched here.
 */
export async function saveRevisitedStep(
  original: PatternRun,
  reopened: PatternRun,
  result: unknown,
  advance: AdvanceRun,
): Promise<{ run: PatternRun; retained: readonly RetainedStep[]; reviewIds: string[] }> {
  const target = reopened.view.pending;
  if (!target) throw new Error('This step could not be reopened.');
  const index = original.view.items.findIndex(
    ({ effect }) => effect.effect_id === target.effect_id && effect.run_id === target.run_id,
  );
  if (index < 0) throw new Error('This step no longer belongs to this practice.');
  let run = await advance(
    reopened,
    { Fulfill: { effect_id: target.effect_id, result } },
    target.run_id,
  );
  const later = original.view.items
    .slice(index + 1)
    .filter(
      ({ effect, result }) => result !== null && effect.request.kind.startsWith('interaction.'),
    );
  for (const item of later) {
    const pending = run.view.pending;
    if (
      run.view.status !== 'Waiting' ||
      !pending ||
      pending.effect_id !== item.effect.effect_id ||
      pending.run_id !== item.effect.run_id ||
      pending.request.kind !== item.effect.request.kind ||
      executionStepKey(pending) !== executionStepKey(item.effect) ||
      pending.request.kind === 'interaction.timer' ||
      (pending.request.kind === 'interaction.form' &&
        Array.isArray(pending.request.payload.blocks) &&
        pending.request.payload.blocks.some((block: { type?: string }) => block.type === 'timer'))
    )
      break;
    try {
      run = await advance(
        run,
        { Fulfill: { effect_id: pending.effect_id, result: item.result } },
        pending.run_id,
      );
    } catch (cause) {
      // Rust may reject a formerly valid choice/field after the earlier edit.
      if (String(cause).includes('PATTERN_COMMAND_REJECTED')) break;
      throw cause;
    }
  }
  const accepted = new Set(worksheetSteps(run.view).map(({ effect }) => executionStepKey(effect)));
  const retained = worksheetSteps(original.view).filter(
    (step) =>
      step.number > 0 &&
      step.effect.effect_id !== target.effect_id &&
      !accepted.has(executionStepKey(step.effect)),
  );
  return { run, retained, reviewIds: later.map(({ effect }) => effect.effect_id) };
}

export function supportsStepEditing(effect: PatternEffect): boolean {
  return [
    'interaction.form',
    'interaction.ask',
    'interaction.rate',
    'interaction.choose',
    'interaction.select',
    'interaction.timer',
  ].includes(effect.request.kind);
}

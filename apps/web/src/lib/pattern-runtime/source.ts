import type { PatternEffect, PatternRun } from './types';
import { executePatternRequest } from './wasm';

const MAX_CHECKPOINT_BYTES = 2 * 1024 * 1024;

function checkpoint(value: string): unknown {
  if (new TextEncoder().encode(value).byteLength > MAX_CHECKPOINT_BYTES)
    throw new Error('Practice checkpoint is too large.');
  return JSON.parse(value) as unknown;
}

async function execute(request: Record<string, unknown>): Promise<PatternRun> {
  // Rust constructs the view and validates commands/checkpoints. No control-flow
  // or field validation is implemented in this transport adapter.
  return (await executePatternRequest('source', request)) as PatternRun;
}

export function startSourceRun(
  source: string,
  inputs: Record<string, unknown> = {},
  rootId = crypto.randomUUID(),
): Promise<PatternRun> {
  return execute({ operation: 'start', source, root_id: rootId, inputs });
}

export function applySourceAction(
  run: PatternRun,
  event: unknown,
  runId: string,
): Promise<PatternRun> {
  return execute({
    operation: 'apply',
    saved: run.saved,
    expected_revision: run.view.revision,
    command: { run_id: runId, event },
  });
}

/** Reopen a completed participant step through Rust's validated journal replay. */
export function rewindSourceRun(run: PatternRun, effect: PatternEffect): Promise<PatternRun> {
  return execute({
    operation: 'rewind',
    saved: run.saved,
    expected_revision: run.view.revision,
    run_id: effect.run_id,
    effect_id: effect.effect_id,
  });
}

/** Explicit handoff only. This includes private answers; never put it in a URL or logs. */
export function serializeSourceRun(run: PatternRun): string {
  const serialized = JSON.stringify(run.saved);
  checkpoint(serialized);
  return serialized;
}

/** Replay-validate in Rust and require the exact pinned practice, without dispatching effects. */
export async function restoreSourceRun(source: string, serialized: string): Promise<PatternRun> {
  return execute({ operation: 'restore', source, saved: checkpoint(serialized) });
}

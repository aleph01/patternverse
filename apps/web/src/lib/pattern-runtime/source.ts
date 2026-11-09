import type { PatternEffect, PatternRun } from './types';
import { executePatternRequest } from './wasm';
import type { WidgetPackage } from '@patternverse/workspace';

const MAX_CHECKPOINT_BYTES = 2 * 1024 * 1024;

export interface SourceRunOptions {
  isolated?: boolean;
  widgets?: Record<string, WidgetPackage>;
  data?: Record<string, unknown>;
}

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
  rootId: string = crypto.randomUUID(),
  options: Readonly<SourceRunOptions> = {},
): Promise<PatternRun> {
  return execute({
    operation: 'start',
    source,
    root_id: rootId,
    inputs,
    ...(options.isolated ? { data: {}, widgets: {} } : {}),
    ...(options.data ? { data: options.data } : {}),
    ...(options.widgets ? { widgets: options.widgets } : {}),
  });
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

/** History owns an already-associated checkpoint. Resume its pinned source, not
 * the article's latest revision. Rust still rebuilds and replay-validates every
 * saved source, resource and receipt; this is only extraction of transport metadata.
 * Explicit handoffs/embeds continue to use restoreSourceRun's exact-source check.
 */
export async function resumeSourceRun(serialized: string): Promise<PatternRun> {
  const saved = checkpoint(serialized) as {
    manager?: { snapshot?: { root_name?: unknown; sources?: Record<string, unknown> } };
  } | null;
  const snapshot = saved?.manager?.snapshot;
  const source =
    typeof snapshot?.root_name === 'string' ? snapshot.sources?.[snapshot.root_name] : undefined;
  if (typeof source !== 'string')
    throw new Error('This checkpoint does not include its practice source.');
  return execute({ operation: 'restore', source, saved });
}

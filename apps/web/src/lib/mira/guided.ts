import { executePatternRequest } from '$lib/pattern-runtime/wasm';
import type { PatternEffect, PatternView, PatternRun } from '$lib/pattern-runtime/types';
import type { PrivateMiraStore } from './private-store';

export type Technique = Readonly<{
  id: string;
  title: string;
  modality: string;
  needs_ai: boolean;
}>;

/** Compatibility names for Mira's existing persistence adapter. */
export type GuidedEffect = PatternEffect;
export type GuidedView = PatternView;

export type GuidedRun = Readonly<{ view: GuidedView; token: string }>;
/** An ephemeral run for focused practice outside a Mira conversation. */
export type StandaloneRun = PatternRun;
type RunResponse = Readonly<{ version: 1; kind: 'run'; saved: unknown; view: GuidedView }>;
type CatalogResponse = Readonly<{
  version: 1;
  kind: 'catalog';
  techniques: readonly Technique[];
}>;

/** Load the same Rust interpreter used by the native host; no JavaScript fallback exists. */
async function execute(request: Record<string, unknown>): Promise<RunResponse | CatalogResponse> {
  let parsed: unknown;
  try {
    parsed = await executePatternRequest('catalog', { version: 1, ...request });
  } catch (cause) {
    throw new Error(`Guided exercise could not continue: ${String(cause)}`, { cause });
  }
  if (
    !isRecord(parsed) ||
    parsed.version !== 1 ||
    !['run', 'catalog'].includes(String(parsed.kind))
  ) {
    throw new Error('Guided exercise returned an invalid response.');
  }
  return parsed as RunResponse | CatalogResponse;
}

/** Show only techniques authored for the current modality. */
export async function listTechniques(modality: string): Promise<readonly Technique[]> {
  const response = await execute({ operation: 'catalog', modality });
  if (response.kind !== 'catalog' || !Array.isArray(response.techniques))
    throw new Error('Guided exercise catalog is invalid.');
  return response.techniques;
}

/** Start a bundled Pattern Markdown technique without creating a chat or writing private data. */
export async function startStandaloneRun(
  techniqueId: string,
  textInputs: Readonly<Record<string, string>> = {},
): Promise<StandaloneRun> {
  const response = await execute({
    operation: 'start',
    technique_id: techniqueId,
    root_id: crypto.randomUUID(),
    inputs: Object.fromEntries(
      Object.entries(textInputs).map(([name, value]) => [name, { type: 'text', value }]),
    ),
  });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Pattern Markdown returned an invalid run.');
  return { view: response.view, saved: response.saved };
}

/** Advance the exact displayed revision; the caller owns this in-memory checkpoint. */
export async function applyStandaloneAction(
  current: StandaloneRun,
  event: unknown,
  runId: string,
): Promise<StandaloneRun> {
  const response = await execute({
    operation: 'apply',
    saved: current.saved,
    expected_revision: current.view.revision,
    command: { run_id: runId, event },
  });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Pattern Markdown returned an invalid run.');
  return { view: response.view, saved: response.saved };
}

/** Reopen an accepted participant interaction without reusing downstream results. */
export async function rewindStandaloneRun(
  current: StandaloneRun,
  effect: PatternEffect,
): Promise<StandaloneRun> {
  const response = await execute({
    operation: 'rewind',
    saved: current.saved,
    expected_revision: current.view.revision,
    run_id: effect.run_id,
    effect_id: effect.effect_id,
  });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Pattern Markdown returned an invalid run.');
  return { view: response.view, saved: response.saved };
}

/** Restore a pinned run without redispatching its historical effects. */
export async function loadGuidedRun(
  store: PrivateMiraStore,
  sessionId: string,
): Promise<GuidedRun | null> {
  const record = await store.loadRun(sessionId);
  if (!record) return null;
  const response = await execute({ operation: 'load', saved: record.saved });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Saved guided exercise is invalid.');
  return { view: response.view, token: record.token };
}

/** Validate an imported checkpoint with Rust replay before any private-store write. */
export async function validateGuidedSaved(saved: unknown): Promise<void> {
  const response = await execute({ operation: 'load', saved });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Imported guided exercise is invalid.');
}

/** Start only after the previous exercise ended; commit before returning a view. */
export async function startGuidedRun(
  store: PrivateMiraStore,
  sessionId: string,
  techniqueId: string,
): Promise<GuidedRun> {
  const existing = await loadGuidedRun(store, sessionId);
  if (existing && ['Waiting', 'Paused'].includes(existing.view.status))
    throw new Error('End the current exercise before starting another.');
  const response = await execute({
    operation: 'start',
    technique_id: techniqueId,
    root_id: crypto.randomUUID(),
    inputs: {},
  });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Guided exercise returned an invalid run.');
  const token = await store.saveRun(sessionId, response.saved, existing?.token ?? null);
  return { view: response.view, token };
}

/** Apply a participant action against the exact displayed revision, then commit it. */
export async function applyGuidedAction(
  store: PrivateMiraStore,
  sessionId: string,
  current: GuidedRun,
  event: unknown,
  runId: string,
): Promise<GuidedRun> {
  const record = await store.loadRun(sessionId);
  if (!record || record.token !== current.token)
    throw new Error('Exercise changed elsewhere. Reload it before continuing.');
  const response = await execute({
    operation: 'apply',
    saved: record.saved,
    expected_revision: current.view.revision,
    command: { run_id: runId, event },
  });
  if (response.kind !== 'run' || !validView(response.view))
    throw new Error('Guided exercise returned an invalid run.');
  const token = await store.saveRun(sessionId, response.saved, current.token);
  return { view: response.view, token };
}

function validView(value: unknown): value is GuidedView {
  return (
    isRecord(value) &&
    typeof value.technique_id === 'string' &&
    typeof value.root_id === 'string' &&
    Number.isSafeInteger(value.revision) &&
    ['Waiting', 'Paused', 'Completed', 'Cancelled', 'Failed'].includes(String(value.status)) &&
    (value.pending === null || isRecord(value.pending)) &&
    Array.isArray(value.items) &&
    isRecord(value.outputs)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

import init, { dispatch } from './engine/pattern_wasm.js';
import type { PrivateMiraStore } from './private-store';

export type Technique = Readonly<{
  id: string;
  title: string;
  modality: string;
  needs_ai: boolean;
}>;

export type GuidedEffect = Readonly<{
  effect_id: string;
  run_id: string;
  request: Readonly<{
    kind: string;
    payload: Readonly<Record<string, unknown>>;
  }>;
}>;

export type GuidedView = Readonly<{
  technique_id: string;
  root_id: string;
  revision: number;
  status: 'Waiting' | 'Paused' | 'Completed' | 'Cancelled' | 'Failed';
  pending: GuidedEffect | null;
  items: readonly Readonly<{ effect: GuidedEffect; result: unknown | null }>[];
  outputs: Readonly<Record<string, unknown>>;
}>;

export type GuidedRun = Readonly<{ view: GuidedView; token: string }>;
type RunResponse = Readonly<{ version: 1; kind: 'run'; saved: unknown; view: GuidedView }>;
type CatalogResponse = Readonly<{
  version: 1;
  kind: 'catalog';
  techniques: readonly Technique[];
}>;

let initialization: Promise<unknown> | undefined;

/** Load the same Rust interpreter used by the native host; no JavaScript fallback exists. */
async function execute(request: Record<string, unknown>): Promise<RunResponse | CatalogResponse> {
  initialization ??= init();
  await initialization;
  let parsed: unknown;
  try {
    parsed = JSON.parse(dispatch(JSON.stringify({ version: 1, ...request })));
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

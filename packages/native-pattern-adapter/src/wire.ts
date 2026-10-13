import type { ChatRun, RevisionRef, RunStatus, RunView } from './types.js';

/** Decode only the stable coordination fields; Rust owns effect payload semantics. */
export function decodeNativeRuns(raw: unknown): readonly ChatRun[] {
  if (!Array.isArray(raw)) throw new Error('Invalid native pattern response.');
  return raw.map(decodeRun);
}

export function validRevision(value: unknown): value is RevisionRef {
  return (
    isRecord(value) &&
    typeof value.artifact_id === 'string' &&
    Boolean(value.artifact_id.trim()) &&
    typeof value.revision_id === 'string' &&
    Boolean(value.revision_id.trim())
  );
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeRun(value: unknown): ChatRun {
  if (!isRecord(value) || !isRecord(value.view)) throw new Error('Invalid native pattern run.');
  const view = value.view;
  const statuses: readonly unknown[] = ['Waiting', 'Paused', 'Completed', 'Cancelled', 'Failed'];
  if (
    typeof view.root_id !== 'string' ||
    !view.root_id ||
    !Number.isSafeInteger(view.revision) ||
    (view.revision as number) < 0 ||
    !statuses.includes(view.status) ||
    !Array.isArray(view.items)
  ) {
    throw new Error('Invalid native pattern view.');
  }
  const pending = view.pending;
  if (
    pending !== null &&
    (!isRecord(pending) ||
      typeof pending.effect_id !== 'string' ||
      typeof pending.run_id !== 'string' ||
      !isRecord(pending.request))
  ) {
    throw new Error('Invalid native pattern effect.');
  }
  const library = value.library;
  if (
    library !== null &&
    (!isRecord(library) ||
      !isRecord(library.reference) ||
      !validRevision(library.reference) ||
      typeof library.title !== 'string')
  ) {
    throw new Error('Invalid native library reference.');
  }
  if (value.pilot !== null && typeof value.pilot !== 'string') throw new Error('Invalid pilot.');
  if (value.anchor_id !== null && typeof value.anchor_id !== 'string') {
    throw new Error('Invalid pattern anchor.');
  }
  return {
    pilot: value.pilot as string | null,
    library: library as ChatRun['library'],
    anchor_id: value.anchor_id as string | null,
    view: {
      root_id: view.root_id,
      revision: view.revision as number,
      status: view.status as RunStatus,
      pending: pending as RunView['pending'],
      items: view.items,
    },
  };
}

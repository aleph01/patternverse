import type { PatternRef } from '@patternverse/companion-core';

/** An exact immutable executable revision in Mira's encrypted Rust library. */
export type RevisionRef = Readonly<{ artifact_id: string; revision_id: string }>;

/** An explicit link from a Patternverse article to an installed executable. */
export type ExecutableLink = Readonly<{ entity: PatternRef; native: RevisionRef }>;

/** Resolves source-qualified links; a title or bare entity ID is insufficient. */
export interface ExecutableLinks {
  resolve(ref: PatternRef): Promise<ExecutableLink | null>;
}

/** Thin IPC port, injected so the adapter has no browser or Tauri dependency. */
export interface NativeInvoke {
  invoke(command: 'session_pattern_run', args: Readonly<Record<string, unknown>>): Promise<unknown>;
}

/** The Rust core's tagged input values; it remains the final type validator. */
export type PatternValue =
  | Readonly<{ type: 'text'; value: string }>
  | Readonly<{ type: 'number'; value: number }>
  | Readonly<{ type: 'boolean'; value: boolean }>
  | Readonly<{ type: 'choice'; value: Readonly<{ value: string; label: string }> }>
  | Readonly<{ type: 'choices'; value: readonly Readonly<{ value: string; label: string }>[] }>
  | Readonly<{
      type: 'enum';
      value: Readonly<{ schema: { name: string; variants: readonly string[] }; variant: string }>;
    }>
  | Readonly<{
      type: 'list';
      value: Readonly<{ element_type: PatternType; items: readonly PatternValue[] }>;
    }>
  | Readonly<{ type: 'record'; value: Readonly<Record<string, PatternValue>> }>;
export type PatternType =
  | 'text'
  | 'number'
  | 'boolean'
  | 'choice'
  | 'choices'
  | Readonly<{ list: PatternType }>
  | Readonly<{ record: Readonly<Record<string, PatternType>> }>
  | Readonly<{ enum: Readonly<{ name: string; variants: readonly string[] }> }>;
export type PatternInputs = Readonly<Record<string, PatternValue>>;
export type RunStatus = 'Waiting' | 'Paused' | 'Completed' | 'Cancelled' | 'Failed';

/** Only the stable fields needed to coordinate a run are decoded here. */
export type RunView = Readonly<{
  root_id: string;
  revision: number;
  status: RunStatus;
  pending: Readonly<{ effect_id: string; run_id: string; request: unknown }> | null;
  items: readonly unknown[];
}>;

export type ChatRun = Readonly<{
  pilot: string | null;
  library: Readonly<{ reference: RevisionRef; title: string }> | null;
  anchor_id: string | null;
  view: RunView;
}>;

export type RunCommand = Readonly<{
  run_id: string;
  event: 'Pause' | 'Resume' | 'Cancel' | Readonly<Record<string, unknown>>;
}>;

/** Native Pattern Markdown operations. No inference is performed by this port. */
export interface NativePatternRuns {
  load(sessionId: string, resetToken?: string): Promise<readonly ChatRun[]>;
  start(
    sessionId: string,
    pattern: PatternRef,
    inputs: PatternInputs,
    anchorId: string | null,
    resetToken?: string,
  ): Promise<readonly ChatRun[]>;
  apply(
    sessionId: string,
    view: RunView,
    command: RunCommand,
    resetToken?: string,
  ): Promise<readonly ChatRun[]>;
}

/**
 * Adapt Patternverse identities to Mira's existing `session_pattern_run`
 * command. This is the native path; web availability remains a separate
 * capability decision rather than an implicit cloud or JavaScript fallback.
 */
export function createNativePatternRuns(
  native: NativeInvoke,
  links: ExecutableLinks,
): NativePatternRuns {
  const execute = async (
    sessionId: string,
    operation: Readonly<Record<string, unknown>>,
    resetToken?: string,
  ): Promise<readonly ChatRun[]> => {
    if (!sessionId.trim()) throw new Error('Session ID is required.');
    const raw = await native.invoke('session_pattern_run', {
      sessionId,
      resetToken: resetToken ?? null,
      operation,
    });
    if (!Array.isArray(raw)) throw new Error('Invalid native pattern response.');
    return raw.map(decodeRun);
  };

  return {
    load: (sessionId, resetToken) => execute(sessionId, { action: 'load' }, resetToken),
    start: async (sessionId, pattern, inputs, anchorId, resetToken) => {
      const link = await links.resolve(pattern);
      if (!link || !samePattern(link.entity, pattern) || !validRevision(link.native)) {
        throw new Error('No executable revision is installed for this Patternverse pattern.');
      }
      return execute(
        sessionId,
        {
          action: 'start_library',
          reference: link.native,
          inputs,
          anchor_id: anchorId,
        },
        resetToken,
      );
    },
    apply: (sessionId, view, command, resetToken) => {
      if (
        command.run_id !== view.root_id &&
        !view.items.some(
          (item) =>
            isRecord(item) && isRecord(item.effect) && item.effect.run_id === command.run_id,
        )
      ) {
        throw new Error('Command run is not part of the loaded pattern view.');
      }
      return execute(
        sessionId,
        {
          action: 'apply',
          root_id: view.root_id,
          revision: view.revision,
          command,
        },
        resetToken,
      );
    },
  };
}

function samePattern(left: PatternRef, right: PatternRef): boolean {
  return (
    left.sourceId === right.sourceId &&
    left.entityId === right.entityId &&
    left.revision === right.revision
  );
}

function validRevision(value: unknown): value is RevisionRef {
  return (
    isRecord(value) &&
    typeof value.artifact_id === 'string' &&
    Boolean(value.artifact_id.trim()) &&
    typeof value.revision_id === 'string' &&
    Boolean(value.revision_id.trim())
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
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

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

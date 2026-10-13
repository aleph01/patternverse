/** Projections of the Rust runtime, not a second implementation of Petal semantics. */
export type PatternEffect = Readonly<{
  effect_id: string;
  run_id: string;
  node_id?: number;
  snapshot_id?: string;
  loop_context?: Readonly<{ node_id: number; iteration: number; max: number | null }> | null;
  request: Readonly<{ kind: string; payload: Readonly<Record<string, unknown>> }>;
}>;

export type PatternView = Readonly<{
  technique_id: string;
  root_id: string;
  revision: number;
  status: 'Waiting' | 'Paused' | 'Completed' | 'Cancelled' | 'Failed';
  pending: PatternEffect | null;
  items: readonly Readonly<{ effect: PatternEffect; result: unknown | null }>[];
  outputs: Readonly<Record<string, unknown>>;
}>;

/** The caller owns the checkpoint. The bridge never writes storage or calls an AI model. */
export type PatternRun = Readonly<{ view: PatternView; saved: unknown }>;

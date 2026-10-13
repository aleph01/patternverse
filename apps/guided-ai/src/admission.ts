import { z } from 'zod';
import { MODEL_KINDS } from '@patternverse/guided-ai';
import type { ModelEffect } from '@patternverse/guided-ai';
import type { PracticeManifest, PublicPractice } from './manifest.js';

export const requestSchema = z
  .object({
    patternId: z.string().regex(/^[a-z0-9][a-z0-9-]{0,127}$/),
    effectId: z.string().min(1).max(256),
    consent: z.literal('cloudflare-guided-ai-v1'),
    saved: z.unknown(),
  })
  .strict();
export type GuidedRequest = z.infer<typeof requestSchema>;
export type InvokeRuntime = (
  transport: 'source' | 'catalog',
  request: Record<string, unknown>,
) => unknown;
const checkpointSchema = z.object({
  technique_id: z.string(),
  revision: z.number().int().min(0).max(128),
  manager: z.object({
    snapshot: z.object({ root_name: z.string(), sources: z.record(z.string(), z.string()) }),
    accepted: z.array(z.unknown()).max(128),
    limits: z.object({
      max_runs: z.number().int().min(1).max(1000),
      max_depth: z.number().int().min(1).max(32),
      runtime: z.object({ max_collection_records: z.number().int().min(1).max(1000) }),
    }),
  }),
});
const responseSchema = z.object({
  view: z.object({
    revision: z.number(),
    status: z.literal('Waiting'),
    pending: z.object({
      effect_id: z.string(),
      run_id: z.string(),
      request: z.object({ kind: z.string(), payload: z.record(z.string(), z.unknown()) }),
    }),
  }),
});

/** Check the full dependency closure BEFORE invoking Rust. The host then replay-
 * validates the checkpoint and derives the effect; no caller prompt is accepted. */
export function admit(
  request: GuidedRequest,
  manifest: PracticeManifest,
  invoke: InvokeRuntime,
): { practice: PublicPractice; effect: ModelEffect; revision: number } {
  const practice = Object.hasOwn(manifest, request.patternId)
    ? manifest[request.patternId]
    : undefined;
  if (!practice) throw new Error('Unknown public practice');
  const saved = checkpointSchema.parse(request.saved);
  if (
    saved.technique_id !== practice.root ||
    saved.manager.snapshot.root_name !== practice.root ||
    Object.keys(saved.manager.snapshot.sources).length !== Object.keys(practice.sources).length ||
    Object.entries(practice.sources).some(
      ([name, source]) => saved.manager.snapshot.sources[name] !== source,
    )
  )
    throw new Error('Practice revision mismatch');
  const restored = responseSchema.parse(
    invoke(
      practice.transport,
      practice.transport === 'source'
        ? { operation: 'restore', source: practice.sources[practice.root], saved: request.saved }
        : { version: 1, operation: 'load', saved: request.saved },
    ),
  );
  const effect = restored.view.pending;
  if (effect.effect_id !== request.effectId || !MODEL_KINDS.has(effect.request.kind))
    throw new Error('Not a pending model step');
  return { practice, effect, revision: restored.view.revision };
}

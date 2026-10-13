import type { PatternRun } from '$lib/pattern-runtime/types';
import type { ModelReceipt } from '@patternverse/guided-ai';

export class FreeGuidedAiError extends Error {
  constructor(readonly code: string) {
    super(
      code === 'FREE_LIMIT'
        ? 'Free AI limit reached for today.'
        : code === 'RATE_LIMIT'
          ? 'Please wait a minute before trying this guided step again.'
          : code === 'CONTEXT_TOO_LARGE'
            ? 'This practice has too much context for free AI. Connect with OpenRouter to continue.'
            : code === 'INVALID_STEP'
              ? 'This practice revision is not supported by free AI. Connect with OpenRouter to continue.'
              : 'Free AI is unavailable right now. Try again, or connect with OpenRouter.',
    );
  }
}

/** Availability is public metadata only. No answers or credentials leave the device. */
export async function freeGuidedAiAvailable(
  patternId: string,
  fetcher: typeof fetch = fetch,
): Promise<boolean> {
  try {
    const response = await fetcher('/api/guided-ai/status', {
      credentials: 'omit',
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json'))
      return false;
    const value: unknown = await response.json();
    return (
      record(value) &&
      value.available === true &&
      Array.isArray(value.patternIds) &&
      value.patternIds.includes(patternId)
    );
  } catch {
    return false;
  }
}

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Call ONLY after the participant opts in. A checkpoint includes practice answers
 * for server replay validation, never Mira chat, keys, or the personal workspace. */
export async function fulfillFreeGuidedStep(
  patternId: string,
  run: PatternRun,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<ModelReceipt> {
  signal.throwIfAborted();
  if (!run.view.pending) throw new Error('No pending guided step.');
  const body = JSON.stringify({
    patternId,
    effectId: run.view.pending.effect_id,
    saved: run.saved,
    consent: 'cloudflare-guided-ai-v1',
  });
  if (new TextEncoder().encode(body).byteLength > 192 * 1024)
    throw new FreeGuidedAiError('CONTEXT_TOO_LARGE');
  const response = await fetcher('/api/guided-ai/step', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    credentials: 'omit',
    cache: 'no-store',
    signal: AbortSignal.any([signal, AbortSignal.timeout(25_000)]),
  });
  let value: unknown;
  try {
    value = await response.json();
  } catch {
    throw new FreeGuidedAiError('UNAVAILABLE');
  }
  signal.throwIfAborted();
  if (!response.ok)
    throw new FreeGuidedAiError(
      record(value) && typeof value.code === 'string' ? value.code : 'UNAVAILABLE',
    );
  if (
    !record(value) ||
    value.effectId !== run.view.pending.effect_id ||
    value.revision !== run.view.revision ||
    !record(value.result) ||
    typeof value.result.kind !== 'string' ||
    !Object.hasOwn(value.result, 'value')
  )
    throw new FreeGuidedAiError('INVALID_OUTPUT');
  // The caller applies this receipt through Rust, not a JavaScript state machine.
  return { kind: value.result.kind, value: value.result.value };
}

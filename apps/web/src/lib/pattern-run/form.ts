import type { PatternEffect as GuidedEffect } from '$lib/pattern-runtime/types';
import type { PatternTimerConfig } from './timer';

export type FormBlock =
  | { type: 'show'; content: string }
  | {
      type: 'ask';
      id: string;
      prompt: string;
      required: boolean;
      multiline: boolean;
      placeholder: string | null;
    }
  | { type: 'timer'; id: string; prompt: string; timer: PatternTimerConfig; persistent: boolean };
export type FormValue =
  | { type: 'text'; value: string }
  | {
      type: 'record';
      value: Record<string, { type: 'number' | 'boolean'; value: number | boolean }>;
    };
export type FormAnswers = Record<string, FormValue>;

/** Presentation projection only; the Rust runtime validates every submitted record. */
export function formBlocks(effect: GuidedEffect): readonly FormBlock[] {
  return effect.request.kind === 'interaction.form' && Array.isArray(effect.request.payload.blocks)
    ? (effect.request.payload.blocks as FormBlock[])
    : [];
}
export function formAnswers(result: unknown): FormAnswers {
  if (
    !result ||
    typeof result !== 'object' ||
    !('kind' in result) ||
    result.kind !== 'form' ||
    !('value' in result) ||
    !result.value ||
    typeof result.value !== 'object'
  )
    return {};
  return result.value as FormAnswers;
}
export function formTimerEffect(
  effect: GuidedEffect,
  block: Extract<FormBlock, { type: 'timer' }>,
): GuidedEffect {
  return {
    ...effect,
    effect_id: `${effect.effect_id}:${block.id}`,
    request: {
      kind: 'interaction.timer',
      payload: { prompt: block.prompt, timer: block.timer },
    },
  };
}

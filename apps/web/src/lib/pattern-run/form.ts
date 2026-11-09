import type { PatternEffect as GuidedEffect } from '$lib/pattern-runtime/types';
import type { PatternTimerConfig } from './timer';
import type { PatternOption } from './view';

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
  | { type: 'timer'; id: string; prompt: string; timer: PatternTimerConfig; persistent: boolean }
  | {
      type: 'rate';
      id: string;
      prompt: string;
      rating: {
        min: number;
        max: number;
        prefer: string | null;
        low: string | null;
        high: string | null;
      };
    }
  | {
      type: 'select';
      id: string;
      prompt: string;
      options: readonly PatternOption[];
      selection: { mode: 'single' | 'multi'; min: number; max: number; prefer: string | null };
    };
export type FormChoice = { type: 'choice'; value: { value: string; label: string } };
export type FormValue =
  | { type: 'text'; value: string }
  | { type: 'number'; value: number }
  | FormChoice
  | { type: 'list'; value: { element_type: 'choice'; items: FormChoice[] } }
  | {
      type: 'record';
      value: Record<string, { type: 'number' | 'boolean'; value: number | boolean }>;
    };
export type FormAnswers = Record<string, FormValue>;

export function formSelected(value: FormValue | undefined): string[] {
  if (value?.type === 'choice') return [value.value.value];
  return value?.type === 'list' ? value.value.items.map((item) => item.value.value) : [];
}

/** Display offered labels, never participant-supplied labels from a submitted record. */
export function formAnswerText(
  block: Exclude<FormBlock, { type: 'show' }>,
  value: FormValue | undefined,
): string {
  if (block.type === 'select') {
    const selected = formSelected(value);
    return block.options
      .filter((option) => selected.includes(option.value))
      .map((option) => option.label)
      .join(', ');
  }
  return value?.type === 'text' || value?.type === 'number' ? String(value.value) : '';
}

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

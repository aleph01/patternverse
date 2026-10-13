import type {
  PatternEffect as GuidedEffect,
  PatternView as GuidedView,
} from '$lib/pattern-runtime/types';
import { formatTimerSeconds } from './timer';

export type PatternOption = Readonly<{ value: string; label: string }>;
export type CompletedStep = Readonly<{ effect: GuidedEffect; answer: string; result?: unknown }>;

/** Keep the runner's history derived from the replay-safe Rust projection. */
export function completedSteps(view: GuidedView): readonly CompletedStep[] {
  return view.items.flatMap(({ effect, result }) =>
    result === null || !effect.request.kind.startsWith('interaction.')
      ? []
      : [{ effect, answer: answerFor(effect, result) }],
  );
}

/** Pattern-authored copy is shown as text, never interpreted as HTML. */
export function promptFor(effect: GuidedEffect): string {
  const value =
    effect.request.payload.prompt ??
    effect.request.payload.markdown ??
    effect.request.payload.title;
  return typeof value === 'string' ? value : '';
}

/** The first authored paragraph leads the step; remaining guidance stays readable body copy. */
export function promptParts(effect: GuidedEffect): Readonly<{ heading: string; body: string }> {
  const paragraphs = promptFor(effect)
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return { heading: paragraphs[0] ?? '', body: paragraphs.slice(1).join('\n\n') };
}

export function optionsFor(effect: GuidedEffect): readonly PatternOption[] {
  const value = effect.request.payload.options;
  return Array.isArray(value)
    ? value.filter(
        (option): option is PatternOption =>
          option !== null &&
          typeof option === 'object' &&
          typeof option.value === 'string' &&
          typeof option.label === 'string',
      )
    : [];
}

export function answerFor(effect: GuidedEffect, result: unknown): string {
  if (!result || typeof result !== 'object' || !('value' in result)) return '';
  if (
    effect.request.kind === 'interaction.timer' &&
    result.value &&
    typeof result.value === 'object' &&
    'duration_seconds' in result.value &&
    'elapsed_seconds' in result.value &&
    'completed' in result.value
  ) {
    const value = result.value;
    if (typeof value.duration_seconds !== 'number' || typeof value.elapsed_seconds !== 'number')
      return '';
    return value.completed
      ? `Timer completed · ${formatTimerSeconds(value.duration_seconds)}`
      : `Continued with timer · ${formatTimerSeconds(value.elapsed_seconds)} of ${formatTimerSeconds(value.duration_seconds)} elapsed`;
  }
  const optionLabel = (value: string): string =>
    optionsFor(effect).find((option) => option.value === value)?.label ?? value;
  if (Array.isArray(result.value))
    return result.value
      .filter((value): value is string => typeof value === 'string')
      .map(optionLabel)
      .join(' → ');
  if (typeof result.value === 'string') return optionLabel(result.value);
  if (typeof result.value === 'number') return String(result.value);
  return '';
}

export function lastShownContent(view: GuidedView): string {
  return (
    view.items
      .filter(
        ({ effect }) => effect.request.kind === 'content.show' && !effect.request.payload.view,
      )
      .map(({ effect }) => promptFor(effect))
      .at(-1) ?? ''
  );
}

/** Keep compositional displays between their preceding and following worksheet interactions. */
export function worksheetSteps(
  view: GuidedView,
): readonly (CompletedStep & { number: number; result: unknown })[] {
  let number = 0;
  return view.items.flatMap(({ effect, result }) => {
    if (
      effect.request.kind === 'content.image' ||
      effect.request.kind === 'content.video' ||
      (effect.request.kind === 'content.show' && effect.request.payload.view)
    )
      return [{ effect, answer: '', result, number: 0 }];
    if (result === null || !effect.request.kind.startsWith('interaction.')) return [];
    return [{ effect, answer: answerFor(effect, result), result, number: ++number }];
  });
}

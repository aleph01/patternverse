import type { PatternEffect, PatternView } from '$lib/pattern-runtime/types';
import { formBlocks, formTimerEffect } from './form';
import { timerConfig } from './timer';

/** Sticky timer projection for standalone interactions and grouped forms. */
export function practiceTimerEffects(view: PatternView | null | undefined): PatternEffect[] {
  const effects = new Map<string, PatternEffect>();
  for (const effect of [
    ...(view?.items.map((item) => item.effect) ?? []),
    ...(view?.pending ? [view.pending] : []),
  ]) {
    const candidates =
      effect.request.kind === 'interaction.timer'
        ? [effect]
        : formBlocks(effect).flatMap((block) =>
            block.type === 'timer' ? [formTimerEffect(effect, block)] : [],
          );
    for (const timer of candidates) {
      const config = timerConfig(timer);
      if (config && config.sticky !== false) effects.set(timer.effect_id, timer);
    }
  }
  return [...effects.values()];
}

import type { PracticeRunInput, PracticeResponse } from '@patternverse/workspace';
import type { PatternRun } from '$lib/pattern-runtime/types';
import { serializeSourceRun } from '$lib/pattern-runtime/source';
import { answerFor, promptFor } from './view';
import { executionStepKey } from './revisit';
import { formAnswers, formBlocks, formTimerEffect } from './form';

export type PracticeIdentity = Pick<
  PracticeRunInput,
  'patternRef' | 'patternTitle' | 'patternType' | 'verseIds'
>;
/** Presentation projection only: no parsing, branching, or runtime semantics. */
export function practiceSnapshot(
  run: PatternRun,
  identity: PracticeIdentity,
  options: {
    origin?: PracticeRunInput['origin'];
    id?: string;
    resumable?: boolean;
    context?: Readonly<Record<string, string>>;
    retainedSteps?: PatternRun['view']['items'];
  } = {},
): PracticeRunInput {
  const responses: PracticeResponse[] = Object.entries(options.context ?? {})
    .filter(([, value]) => value.trim())
    .map(([name, answer]) => ({ id: `input:${name}`, prompt: name, answer }));
  // Earlier confirmed answers remain in history even when a timer/model/new path
  // prevents carrying them into the revised executable checkpoint.
  const acceptedIds = new Set(
    run.view.items
      .filter(({ result }) => result !== null)
      .map(({ effect }) => executionStepKey(effect)),
  );
  const retained = (options.retainedSteps ?? []).filter(
    ({ effect }) => !acceptedIds.has(executionStepKey(effect)),
  );
  for (const item of [...run.view.items, ...retained]) {
    const { effect, result } = item;
    const earlier = retained.includes(item);
    const responseId = earlier
      ? `earlier:${effect.run_id}:${effect.effect_id}:${effect.node_id ?? 'unknown'}`
      : `${effect.run_id}:${effect.effect_id}`;
    const prefix = earlier ? 'Earlier response: ' : '';
    if (result === null || !effect.request.kind.startsWith('interaction.')) continue;
    if (effect.request.kind === 'interaction.form') {
      const saved = formAnswers(result);
      for (const block of formBlocks(effect)) {
        if (block.type === 'show') continue;
        const value = saved[block.id];
        responses.push({
          id: `${responseId}:${block.id}`,
          prompt: `${prefix}${block.prompt}`,
          answer:
            block.type === 'ask'
              ? value?.type === 'text'
                ? value.value
                : ''
              : answerFor(formTimerEffect(effect, block), {
                  value:
                    value?.type === 'record'
                      ? Object.fromEntries(
                          Object.entries(value.value).map(([key, item]) => [key, item.value]),
                        )
                      : {},
                }),
        });
      }
    } else
      responses.push({
        id: responseId,
        prompt: `${prefix}${promptFor(effect)}`,
        answer: answerFor(effect, result),
      });
  }
  return {
    ...identity,
    id: options.id ?? run.view.root_id,
    title: identity.patternTitle.slice(0, 120),
    origin: options.origin ?? 'patternverse',
    revision: run.view.revision,
    status:
      run.view.status === 'Completed'
        ? 'completed'
        : ['Waiting', 'Paused'].includes(run.view.status)
          ? 'in-progress'
          : 'stopped',
    responses,
    ...(options.resumable ? { checkpoint: serializeSourceRun(run) } : {}),
  };
}

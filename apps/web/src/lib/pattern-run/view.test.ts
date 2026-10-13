import { describe, expect, it } from 'vitest';
import {
  answerFor,
  completedSteps,
  optionsFor,
  promptFor,
  promptParts,
  worksheetSteps,
  lastShownContent,
} from './view';
import type { GuidedEffect, GuidedView } from '$lib/mira/guided';

const effect: GuidedEffect = {
  effect_id: 'one',
  run_id: 'run',
  request: {
    kind: 'interaction.choose',
    payload: {
      prompt: 'Which direction?',
      options: [{ value: 'begin', label: 'Begin gently' }],
    },
  },
};

describe('standalone pattern view', () => {
  it('shares safe authored prompts, option labels, ratings, and timer answers across hosts', () => {
    expect(
      promptFor({
        ...effect,
        request: { kind: 'interaction.form', payload: { title: 'A title' } },
      }),
    ).toBe('A title');
    const malformed = {
      ...effect,
      request: {
        ...effect.request,
        payload: {
          options: [null, 'bad', { value: 'x' }, { value: 'begin', label: 'Begin gently' }],
        },
      },
    };
    expect(optionsFor(malformed)).toEqual([{ value: 'begin', label: 'Begin gently' }]);
    expect(answerFor(effect, { kind: 'selected_many', value: ['begin', 'unknown'] })).toBe(
      'Begin gently → unknown',
    );
    expect(answerFor(effect, { kind: 'rating', value: 0 })).toBe('0');
    expect(answerFor(effect, null)).toBe('');
    expect(
      answerFor(
        { ...effect, request: { kind: 'interaction.timer', payload: {} } },
        { value: { duration_seconds: 120, elapsed_seconds: 60, completed: false } },
      ),
    ).toBe('Continued with timer · 01:00 of 02:00 elapsed');
  });
  it('keeps displays in replay order without counting them as answered questions', () => {
    const display: GuidedEffect = {
      ...effect,
      effect_id: 'display',
      request: {
        kind: 'content.show',
        payload: { view: { panels: [] }, markdown: 'Displayed collection' },
      },
    };
    const closing: GuidedEffect = {
      ...effect,
      effect_id: 'closing',
      request: { kind: 'content.show', payload: { markdown: 'Finished' } },
    };
    const view: GuidedView = {
      technique_id: 'test',
      root_id: 'run',
      revision: 2,
      status: 'Completed',
      pending: null,
      outputs: {},
      items: [
        { effect, result: { kind: 'selected', value: 'begin' } },
        { effect: display, result: null },
        { effect: { ...effect, effect_id: 'two' }, result: { kind: 'selected', value: 'begin' } },
        { effect: closing, result: null },
      ],
    };
    expect(worksheetSteps(view).map((step) => [step.effect.effect_id, step.number])).toEqual([
      ['one', 1],
      ['display', 0],
      ['two', 2],
    ]);
    expect(lastShownContent(view)).toBe('Finished');
    expect(lastShownContent({ ...view, items: [{ effect: display, result: null }] })).toBe('');
  });
  it('projects replayed choices without reading from a chat transcript', () => {
    const view = {
      technique_id: 'cbt.abc',
      root_id: 'run',
      revision: 1,
      status: 'Waiting',
      pending: null,
      items: [{ effect, result: { kind: 'selected', value: 'begin' } }],
      outputs: {},
    } satisfies GuidedView;
    expect(promptFor(effect)).toBe('Which direction?');
    expect(
      promptParts({
        ...effect,
        request: { ...effect.request, payload: { prompt: 'A heading\n\nA little guidance.' } },
      }),
    ).toEqual({
      heading: 'A heading',
      body: 'A little guidance.',
    });
    expect(optionsFor(effect)).toEqual([{ value: 'begin', label: 'Begin gently' }]);
    expect(answerFor(effect, view.items[0].result)).toBe('Begin gently');
    expect(completedSteps(view)).toEqual([{ effect, answer: 'Begin gently' }]);
    expect(
      completedSteps({
        ...view,
        items: [
          ...view.items,
          {
            effect: {
              ...effect,
              effect_id: 'wording',
              request: { kind: 'language.realize', payload: {} },
            },
            result: { kind: 'realized', value: 'A model-written question' },
          },
        ],
      }),
    ).toHaveLength(1);
  });
});

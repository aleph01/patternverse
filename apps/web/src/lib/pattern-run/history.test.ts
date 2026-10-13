import { expect, it } from 'vitest';
import { practiceSnapshot } from './history';
import type { PatternRun } from '$lib/pattern-runtime/types';

it('projects forms, choices, ratings and timer responses without reinterpreting execution', () => {
  const run: PatternRun = {
    saved: { opaque: 'checkpoint' },
    view: {
      root_id: 'run',
      technique_id: 'test',
      revision: 4,
      status: 'Completed',
      pending: null,
      outputs: {},
      items: [
        {
          effect: {
            effect_id: 'form',
            run_id: 'run',
            request: {
              kind: 'interaction.form',
              payload: {
                blocks: [
                  {
                    type: 'ask',
                    id: 'text',
                    prompt: 'Your thought',
                    required: true,
                    multiline: true,
                    placeholder: null,
                  },
                  {
                    type: 'ask',
                    id: 'optional',
                    prompt: 'Anything else?',
                    required: false,
                    multiline: true,
                    placeholder: null,
                  },
                  {
                    type: 'timer',
                    id: 'time',
                    prompt: 'Reflect',
                    timer: { duration_seconds: 60 },
                    persistent: false,
                  },
                  { type: 'show', content: 'Ignore display-only content' },
                ],
              },
            },
          },
          result: {
            kind: 'form',
            value: {
              text: { type: 'text', value: 'A private response' },
              optional: { type: 'text', value: '' },
              time: {
                type: 'record',
                value: {
                  duration_seconds: { type: 'number', value: 60 },
                  elapsed_seconds: { type: 'number', value: 60 },
                  completed: { type: 'boolean', value: true },
                },
              },
            },
          },
        },
        {
          effect: {
            effect_id: 'choice',
            run_id: 'run',
            request: {
              kind: 'interaction.choose',
              payload: {
                prompt: 'Pick one',
                options: [{ value: 'one', label: 'Balanced alternative' }],
              },
            },
          },
          result: { kind: 'selected', value: 'one' },
        },
        {
          effect: {
            effect_id: 'rating',
            run_id: 'run',
            request: { kind: 'interaction.rate', payload: { prompt: 'How strong?' } },
          },
          result: { kind: 'rating', value: 4 },
        },
        {
          effect: {
            effect_id: 'model',
            run_id: 'run',
            request: { kind: 'agent.generate', payload: {} },
          },
          result: { kind: 'text', value: 'Model-only output' },
        },
      ],
    },
  };
  const snapshot = practiceSnapshot(
    run,
    {
      patternRef: { sourceId: 'commons', entityId: 'test' },
      patternTitle: 'Test',
      patternType: 'pattern',
      verseIds: ['therapy'],
    },
    { resumable: true, context: { problem: 'Context' } },
  );
  expect(snapshot.responses.map((r) => r.answer)).toEqual([
    'Context',
    'A private response',
    '',
    'Timer completed · 01:00',
    'Balanced alternative',
    '4',
  ]);
  expect(snapshot.responses.map((r) => r.id)).toEqual([
    'input:problem',
    'run:form:text',
    'run:form:optional',
    'run:form:time',
    'run:choice',
    'run:rating',
  ]);
  expect(snapshot.checkpoint).toBe('{"opaque":"checkpoint"}');
  expect(snapshot.status).toBe('completed');
});

it('keeps earlier confirmed responses in saved history when revised execution stops for a capability', () => {
  const later = {
    effect: {
      effect_id: 'later',
      run_id: 'run',
      request: { kind: 'interaction.ask', payload: { prompt: 'Your later reflection' } },
    },
    result: { kind: 'text', value: 'Keep my earlier response' },
  };
  const run: PatternRun = {
    saved: {},
    view: {
      root_id: 'run',
      technique_id: 'test',
      revision: 5,
      status: 'Waiting',
      pending: null,
      outputs: {},
      items: [],
    },
  };
  const identity = {
    patternRef: { sourceId: 'commons', entityId: 'test' },
    patternTitle: 'Test',
    patternType: 'pattern' as const,
    verseIds: [],
  };
  const snapshot = practiceSnapshot(run, identity, { retainedSteps: [later] });
  expect(snapshot.responses).toEqual([
    {
      id: 'earlier:run:later:unknown',
      prompt: 'Earlier response: Your later reflection',
      answer: 'Keep my earlier response',
    },
  ]);
  const accepted = practiceSnapshot({ ...run, view: { ...run.view, items: [later] } }, identity, {
    retainedSteps: [later],
  });
  expect(accepted.responses).toHaveLength(1);
  const newBranch = {
    ...later,
    effect: { ...later.effect, node_id: 7 },
    result: { kind: 'text', value: 'Answer on the new path' },
  };
  const changedPath = practiceSnapshot(
    { ...run, view: { ...run.view, items: [newBranch] } },
    identity,
    { retainedSteps: [{ ...later, effect: { ...later.effect, node_id: 3 } }] },
  );
  expect(changedPath.responses.map(({ answer }) => answer)).toEqual([
    'Answer on the new path',
    'Keep my earlier response',
  ]);
  expect(new Set(changedPath.responses.map(({ id }) => id)).size).toBe(2);
});

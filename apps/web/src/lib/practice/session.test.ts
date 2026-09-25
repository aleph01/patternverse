import { describe, expect, it } from 'vitest';
import type { PracticeDefinition } from '@patternverse/schema';
import {
  advancePractice,
  backPractice,
  createPracticeSession,
  discardPracticeSession,
  updatePracticeResponse,
  validateCurrentPracticeStep,
} from './session';
import { createTimer, startTimer } from './timer';

const practice: PracticeDefinition = {
  title: 'Test Practice',
  steps: [
    {
      id: 'first',
      blocks: [
        {
          id: 'answer',
          type: 'text-input',
          label: 'Answer',
          multiline: true,
          required: true,
        },
      ],
    },
    {
      id: 'second',
      blocks: [
        {
          id: 'timer',
          type: 'timer',
          defaultDurationSeconds: 60,
          userAdjustable: true,
        },
      ],
    },
  ],
};

describe('Practice session', () => {
  it('updates responses immutably and blocks required empty fields', () => {
    const initial = createPracticeSession('test');
    expect(validateCurrentPracticeStep(practice, initial)).toEqual({
      answer: 'This field is required.',
    });

    const updated = updatePracticeResponse(initial, 'answer', 'A response');
    expect(initial.responses).toEqual({});
    expect(updated.responses).toEqual({ answer: 'A response' });
    expect(advancePractice(practice, updated)).toMatchObject({
      errors: {},
      session: { currentStepIndex: 1 },
    });
  });

  it('preserves responses and timers across Back and Next', () => {
    const first = updatePracticeResponse(createPracticeSession('test'), 'answer', 'Keep me');
    const second = advancePractice(practice, first).session;
    const withTimer = {
      ...second,
      timers: { timer: startTimer(createTimer(60), 1_000) },
    };

    const back = backPractice(withTimer);
    const forward = advancePractice(practice, back).session;
    expect(forward.responses.answer).toBe('Keep me');
    expect(forward.timers.timer?.type).toBe('running');
  });

  it('clears all private session data on completion or exit', () => {
    const active = {
      ...updatePracticeResponse(createPracticeSession('test'), 'answer', 'Private'),
      currentStepIndex: 1,
      timers: { timer: createTimer(60) },
    };
    const completed = advancePractice(practice, active).session;
    expect(completed).toMatchObject({ phase: 'completed', responses: {}, timers: {} });

    const discarded = discardPracticeSession(active);
    expect(discarded).toMatchObject({
      phase: 'active',
      currentStepIndex: 0,
      responses: {},
      timers: {},
    });
  });
});

import type { PracticeDefinition } from '@patternverse/schema';
import type { TimerSessionState } from './timer';

export type PracticeSessionPhase = 'active' | 'completed';

export type PracticeSession = {
  readonly practiceId: string;
  readonly phase: PracticeSessionPhase;
  readonly currentStepIndex: number;
  readonly responses: Readonly<Record<string, string>>;
  readonly timers: Readonly<Record<string, TimerSessionState>>;
};

export type PracticeAdvanceResult = {
  readonly session: PracticeSession;
  readonly errors: Readonly<Record<string, string>>;
};

export const createPracticeSession = (practiceId: string): PracticeSession => ({
  practiceId,
  phase: 'active',
  currentStepIndex: 0,
  responses: {},
  timers: {},
});

export const updatePracticeResponse = (
  session: PracticeSession,
  blockId: string,
  response: string,
): PracticeSession => ({
  ...session,
  responses: { ...session.responses, [blockId]: response },
});

export const updatePracticeTimer = (
  session: PracticeSession,
  blockId: string,
  timer: TimerSessionState,
): PracticeSession => ({
  ...session,
  timers: { ...session.timers, [blockId]: timer },
});

export const validateCurrentPracticeStep = (
  practice: PracticeDefinition,
  session: PracticeSession,
): Readonly<Record<string, string>> => {
  const step = practice.steps[session.currentStepIndex];
  if (!step) return {};
  return Object.fromEntries(
    step.blocks.flatMap((block) =>
      block.type === 'text-input' && block.required && !session.responses[block.id]?.trim()
        ? [[block.id, 'This field is required.'] as const]
        : [],
    ),
  );
};

export const advancePractice = (
  practice: PracticeDefinition,
  session: PracticeSession,
): PracticeAdvanceResult => {
  const errors = validateCurrentPracticeStep(practice, session);
  if (Object.keys(errors).length > 0) return { session, errors };
  if (session.currentStepIndex < practice.steps.length - 1) {
    return { session: { ...session, currentStepIndex: session.currentStepIndex + 1 }, errors };
  }
  return {
    session: { ...session, phase: 'completed', responses: {}, timers: {} },
    errors,
  };
};

export const backPractice = (session: PracticeSession): PracticeSession => ({
  ...session,
  currentStepIndex: Math.max(0, session.currentStepIndex - 1),
});

export const discardPracticeSession = (session: PracticeSession): PracticeSession =>
  createPracticeSession(session.practiceId);

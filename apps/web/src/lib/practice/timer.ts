import { MAX_TIMER_DURATION_SECONDS } from '@patternverse/schema';

export type TimerSessionState =
  | {
      readonly type: 'idle';
      readonly configuredDurationSeconds: number;
    }
  | {
      readonly type: 'running';
      readonly configuredDurationSeconds: number;
      readonly startedAt: number;
      readonly accumulatedElapsedSeconds: number;
    }
  | {
      readonly type: 'paused';
      readonly configuredDurationSeconds: number;
      readonly accumulatedElapsedSeconds: number;
    }
  | {
      readonly type: 'completed';
      readonly configuredDurationSeconds: number;
    };

const assertDuration = (durationSeconds: number): void => {
  if (!Number.isInteger(durationSeconds) || durationSeconds <= 0) {
    throw new Error('Timer duration must be a positive integer.');
  }
  if (durationSeconds > MAX_TIMER_DURATION_SECONDS) {
    throw new Error('Timer duration must not exceed 24 hours.');
  }
};

export const createTimer = (configuredDurationSeconds: number): TimerSessionState => {
  assertDuration(configuredDurationSeconds);
  return { type: 'idle', configuredDurationSeconds };
};

const elapsedSeconds = (state: TimerSessionState, now: number): number => {
  if (state.type === 'completed') return state.configuredDurationSeconds;
  if (state.type === 'idle') return 0;
  if (state.type === 'paused') return state.accumulatedElapsedSeconds;
  return state.accumulatedElapsedSeconds + Math.max(0, now - state.startedAt) / 1000;
};

export const remainingTimerSeconds = (state: TimerSessionState, now: number): number =>
  Math.max(0, Math.ceil(state.configuredDurationSeconds - elapsedSeconds(state, now)));

export const reconcileTimer = (state: TimerSessionState, now: number): TimerSessionState =>
  state.type === 'running' && remainingTimerSeconds(state, now) === 0
    ? { type: 'completed', configuredDurationSeconds: state.configuredDurationSeconds }
    : state;

export const startTimer = (state: TimerSessionState, now: number): TimerSessionState =>
  state.type === 'idle'
    ? {
        type: 'running',
        configuredDurationSeconds: state.configuredDurationSeconds,
        startedAt: now,
        accumulatedElapsedSeconds: 0,
      }
    : state;

export const pauseTimer = (state: TimerSessionState, now: number): TimerSessionState => {
  if (state.type !== 'running') return state;
  const reconciled = reconcileTimer(state, now);
  if (reconciled.type === 'completed') return reconciled;
  return {
    type: 'paused',
    configuredDurationSeconds: state.configuredDurationSeconds,
    accumulatedElapsedSeconds: elapsedSeconds(state, now),
  };
};

export const resumeTimer = (state: TimerSessionState, now: number): TimerSessionState =>
  state.type === 'paused'
    ? {
        type: 'running',
        configuredDurationSeconds: state.configuredDurationSeconds,
        startedAt: now,
        accumulatedElapsedSeconds: state.accumulatedElapsedSeconds,
      }
    : state;

export const resetTimer = (state: TimerSessionState): TimerSessionState =>
  createTimer(state.configuredDurationSeconds);

export const adjustTimerDuration = (
  state: TimerSessionState,
  configuredDurationSeconds: number,
): TimerSessionState => {
  if (state.type !== 'idle') return state;
  return createTimer(configuredDurationSeconds);
};

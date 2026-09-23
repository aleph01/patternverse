import { describe, expect, it } from 'vitest';
import {
  adjustTimerDuration,
  createTimer,
  pauseTimer,
  reconcileTimer,
  remainingTimerSeconds,
  resetTimer,
  resumeTimer,
  startTimer,
} from './timer';

describe('Practice timer model', () => {
  it('starts, pauses, resumes, reconciles wall-clock time, and completes', () => {
    const idle = createTimer(600);
    const running = startTimer(idle, 1_000);
    expect(running.type).toBe('running');
    expect(remainingTimerSeconds(running, 31_000)).toBe(570);

    const paused = pauseTimer(running, 61_000);
    expect(paused).toMatchObject({ type: 'paused', accumulatedElapsedSeconds: 60 });
    expect(remainingTimerSeconds(paused, 500_000)).toBe(540);

    const resumed = resumeTimer(paused, 500_000);
    expect(remainingTimerSeconds(resumed, 530_000)).toBe(510);
    expect(reconcileTimer(resumed, 1_100_000).type).toBe('completed');
  });

  it('adjusts only an idle timer and reset preserves the configured duration', () => {
    const adjusted = adjustTimerDuration(createTimer(600), 300);
    expect(adjusted.configuredDurationSeconds).toBe(300);
    const running = startTimer(adjusted, 0);
    expect(adjustTimerDuration(running, 120)).toBe(running);
    expect(resetTimer(running)).toEqual(createTimer(300));
  });

  it('rejects unsupported durations', () => {
    expect(() => createTimer(0)).toThrow('positive integer');
    expect(() => createTimer(86_401)).toThrow('24 hours');
  });
});

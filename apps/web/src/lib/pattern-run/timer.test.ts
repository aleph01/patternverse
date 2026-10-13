import { describe, expect, it } from 'vitest';
import type { GuidedEffect } from '$lib/mira/guided';
import { createTimer, startTimer, pauseTimer } from '$lib/practice/timer';
import {
  timerConfig,
  timerCanContinue,
  timerResult,
  formatTimerSeconds,
  formatTimerMinutes,
  timerSecondsFromMinutes,
} from './timer';
import { answerFor } from './view';

const config = {
  duration_seconds: 60,
  min_seconds: 10,
  max_seconds: 120,
  adjustable: true,
  blocking: false,
};
const effect = (timer: unknown): GuidedEffect => ({
  effect_id: 'timer',
  run_id: 'run',
  request: { kind: 'interaction.timer', payload: { timer } },
});

describe('Timer host contract', () => {
  it('converts minute-based authoring back to exact seconds, including existing short timers', () => {
    expect(formatTimerMinutes(90)).toBe('1.5');
    expect(timerSecondsFromMinutes('1.5')).toBe(90);
    for (let seconds = 1; seconds <= 86_400; seconds++) {
      if (timerSecondsFromMinutes(formatTimerMinutes(seconds)) !== seconds)
        throw new Error(`Changed ${seconds}`);
    }
    for (const value of ['', '0', '-1', '1441', 'NaN', '1.001'])
      expect(timerSecondsFromMinutes(value)).toBeNull();
  });
  it('fails closed on unsupported and contradictory configuration', () => {
    expect(timerConfig(effect(config))).toEqual(config);
    for (const timer of [
      { ...config, sticky: 'false' },
      null,
      {},
      { ...config, duration_seconds: 0 },
      { ...config, duration_seconds: 1.5 },
      { ...config, min_seconds: 61 },
      { ...config, max_seconds: 59 },
      { ...config, max_seconds: 86_401 },
      { ...config, adjustable: false },
      { ...config, blocking: undefined },
    ]) {
      expect(timerConfig(effect(timer))).toBeNull();
    }
  });
  it('reports bounded whole-second snapshots for replay rather than a live value', () => {
    const running = startTimer(createTimer(60), 10_000);
    expect(timerCanContinue(config, createTimer(60))).toBe(false);
    expect(timerCanContinue(config, running)).toBe(true);
    expect(timerCanContinue({ ...config, blocking: true }, running)).toBe(false);
    expect(timerResult(running, 15_900)).toEqual({
      duration_seconds: 60,
      elapsed_seconds: 5,
      completed: false,
    });
    expect(timerResult(pauseTimer(running, 15_900), 100_000).elapsed_seconds).toBe(5);
    expect(timerResult(running, 100_000)).toEqual({
      duration_seconds: 60,
      elapsed_seconds: 60,
      completed: true,
    });
    expect(answerFor(effect(config), { kind: 'timer', value: timerResult(running, 15_900) })).toBe(
      'Continued with timer · 00:05 of 01:00 elapsed',
    );
    expect(answerFor(effect(config), { kind: 'timer', value: timerResult(running, 100_000) })).toBe(
      'Timer completed · 01:00',
    );
    expect(formatTimerSeconds(86_400)).toBe('24:00:00');
  });
});

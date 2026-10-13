import type { PatternEffect as GuidedEffect } from '$lib/pattern-runtime/types';
import type { TimerSessionState } from '$lib/practice/timer';
import { remainingTimerSeconds } from '$lib/practice/timer';

export type PatternTimerConfig = Readonly<{
  duration_seconds: number;
  adjustable: boolean;
  min_seconds: number;
  max_seconds: number;
  blocking: boolean;
  /** Omitted by older sources and receipts; defaults to sticky. */
  sticky?: boolean;
}>;
export type PatternTimerResult = Readonly<{
  duration_seconds: number;
  elapsed_seconds: number;
  completed: boolean;
}>;

/** Fail closed rather than inventing timer defaults in a host. */
export function timerConfig(effect: GuidedEffect): PatternTimerConfig | null {
  const value = effect.request.payload.timer;
  if (!value || typeof value !== 'object') return null;
  const config = value as PatternTimerConfig;
  const seconds = [config.duration_seconds, config.min_seconds, config.max_seconds];
  if (
    seconds.some((n) => !Number.isInteger(n) || n < 1 || n > 86_400) ||
    typeof config.adjustable !== 'boolean' ||
    typeof config.blocking !== 'boolean' ||
    (config.sticky !== undefined && typeof config.sticky !== 'boolean') ||
    config.min_seconds > config.duration_seconds ||
    config.duration_seconds > config.max_seconds ||
    (!config.adjustable &&
      (config.min_seconds !== config.duration_seconds ||
        config.max_seconds !== config.duration_seconds))
  )
    return null;
  return config;
}

export function timerCanContinue(config: PatternTimerConfig, state: TimerSessionState): boolean {
  return config.blocking ? state.type === 'completed' : state.type !== 'idle';
}

export function timerResult(state: TimerSessionState, now: number): PatternTimerResult {
  const remaining = remainingTimerSeconds(state, now);
  return {
    duration_seconds: state.configuredDurationSeconds,
    elapsed_seconds: state.configuredDurationSeconds - remaining,
    completed: remaining === 0,
  };
}

export function formatTimerSeconds(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  return `${hours ? `${hours}:` : ''}${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

/** Display/authoring units only. Timer state and Pattern Language keep exact whole seconds. */
export function formatTimerMinutes(seconds: number): string {
  return String(Number((seconds / 60).toFixed(6)));
}

export function timerSecondsFromMinutes(minutes: string | number): number | null {
  if (String(minutes).trim() === '') return null;
  const seconds = Number(minutes) * 60;
  const rounded = Math.round(seconds);
  return Number.isFinite(seconds) &&
    Math.abs(seconds - rounded) < 0.0001 &&
    rounded >= 1 &&
    rounded <= 86_400
    ? rounded
    : null;
}

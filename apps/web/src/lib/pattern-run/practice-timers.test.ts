import { describe, expect, it } from 'vitest';
import type { PatternEffect, PatternView } from '$lib/pattern-runtime/types';
import { practiceTimerEffects } from './practice-timers';

const config = {
  duration_seconds: 60,
  min_seconds: 60,
  max_seconds: 60,
  adjustable: false,
  blocking: false,
};
const timer: PatternEffect = {
  effect_id: 'clock',
  run_id: 'run',
  request: { kind: 'interaction.timer', payload: { timer: config } },
};
const view = (pending: PatternEffect | null, effects: PatternEffect[]): PatternView => ({
  technique_id: 'test',
  root_id: 'run',
  revision: 0,
  status: 'Waiting',
  pending,
  items: effects.map((effect) => ({ effect, result: null })),
  outputs: {},
});

describe('practice-wide timer projection', () => {
  it('deduplicates pending/history and includes grouped form timers with stable identities', () => {
    const form: PatternEffect = {
      effect_id: 'form',
      run_id: 'run',
      request: {
        kind: 'interaction.form',
        payload: {
          blocks: [
            { type: 'ask', id: 'answer', prompt: 'Reflect' },
            { type: 'timer', id: 'pause', prompt: 'Quiet pause', timer: config, persistent: true },
          ],
        },
      },
    };
    const effects = practiceTimerEffects(view(timer, [timer, form]));
    expect(effects.map((effect) => effect.effect_id)).toEqual(['clock', 'form:pause']);
    expect(effects[1].request.payload.prompt).toBe('Quiet pause');
  });
  it('excludes step-local standalone and grouped timers from the sticky dock', () => {
    const local = {
      ...timer,
      request: { kind: 'interaction.timer', payload: { timer: { ...config, sticky: false } } },
    };
    const form: PatternEffect = {
      effect_id: 'mixed',
      run_id: 'run',
      request: {
        kind: 'interaction.form',
        payload: {
          blocks: [
            { type: 'timer', id: 'local', timer: { ...config, sticky: false }, persistent: true },
            { type: 'timer', id: 'sticky', timer: { ...config, sticky: true }, persistent: false },
          ],
        },
      },
    };
    expect(
      practiceTimerEffects(view(local, [local, form])).map((effect) => effect.effect_id),
    ).toEqual(['mixed:sticky']);
  });
  it('ignores missing or invalid timer configuration rather than inventing a clock', () => {
    expect(practiceTimerEffects(null)).toEqual([]);
    expect(
      practiceTimerEffects(
        view({ ...timer, request: { kind: 'interaction.timer', payload: {} } }, []),
      ),
    ).toEqual([]);
  });
});

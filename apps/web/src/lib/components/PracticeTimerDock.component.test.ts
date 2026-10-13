// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PracticeTimerDock from './PracticeTimerDock.test.svelte';
import type { PatternEffect, PatternView } from '$lib/pattern-runtime/types';
import { createTimer, startTimer, type TimerSessionState } from '$lib/practice/timer';

const effect: PatternEffect = {
  effect_id: 'timer',
  run_id: 'run',
  request: {
    kind: 'interaction.timer',
    payload: {
      prompt: 'Pause',
      timer: {
        duration_seconds: 2,
        min_seconds: 2,
        max_seconds: 2,
        adjustable: false,
        blocking: false,
      },
    },
  },
};
const view: PatternView = {
  technique_id: 'test',
  root_id: 'run',
  revision: 0,
  status: 'Waiting',
  pending: effect,
  items: [{ effect, result: null }],
  outputs: {},
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('practice-level timer dock', () => {
  it('promotes only started timers, keeps them on reset and removes them when the run is cleared', async () => {
    const timers: Record<string, TimerSessionState> = { timer: createTimer(2) };
    const rendered = render(PracticeTimerDock, {
      view,
      initialTimers: timers,
    });
    expect(screen.queryByRole('complementary')).toBeNull();
    await rendered.rerender({ initialTimers: { timer: startTimer(timers.timer, Date.now()) } });
    expect(screen.getAllByRole('button', { name: 'Pause timer' })).toHaveLength(1);
    expect(vi.getTimerCount()).toBe(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
    expect(screen.getByRole('complementary', { name: 'Practice timers' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start timer' })).toBeTruthy();
    expect(vi.getTimerCount()).toBe(0);
    await rendered.rerender({ initialTimers: {} });
    expect(screen.queryByRole('complementary')).toBeNull();
  });
  it('uses separate clocks for multiple timers and pauses them on run suspension', async () => {
    const second = {
      ...effect,
      effect_id: 'second',
      request: {
        ...effect.request,
        payload: { ...effect.request.payload, prompt: 'Another pause' },
      },
    };
    const timers: Record<string, TimerSessionState> = {
      timer: startTimer(createTimer(2), Date.now()),
      second: startTimer(createTimer(2), Date.now()),
    };
    const onchange = vi.fn();
    const rendered = render(PracticeTimerDock, {
      view: { ...view, pending: second },
      initialTimers: timers,
      onchange,
    });
    expect(screen.getAllByRole('button', { name: 'Pause timer' })).toHaveLength(2);
    expect(vi.getTimerCount()).toBe(2);
    await rendered.rerender({ runningAllowed: false });
    await tick();
    expect(onchange).toHaveBeenCalledWith('timer', expect.objectContaining({ type: 'paused' }));
    expect(onchange).toHaveBeenCalledWith('second', expect.objectContaining({ type: 'paused' }));
    expect(vi.getTimerCount()).toBe(0);
    rendered.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('does not restart historical receipts without host-local timer state', () => {
    render(PracticeTimerDock, {
      view: {
        ...view,
        pending: null,
        status: 'Completed',
        items: [
          {
            effect,
            result: {
              kind: 'timer',
              value: { duration_seconds: 2, elapsed_seconds: 2, completed: true },
            },
          },
        ],
      },
      initialTimers: {},
      onchange: vi.fn(),
    });
    expect(screen.queryByRole('complementary')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
  });
});

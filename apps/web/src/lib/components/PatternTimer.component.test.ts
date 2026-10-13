// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PatternTimer from './PatternTimer.svelte';
import type { GuidedEffect } from '$lib/mira/guided';
import { createTimer, type TimerSessionState } from '$lib/practice/timer';

const effect = (blocking: boolean, adjustable = false): GuidedEffect => ({
  effect_id: 'timer-one',
  run_id: 'run',
  request: {
    kind: 'interaction.timer',
    payload: {
      prompt: 'Pause gently.',
      timer: {
        duration_seconds: adjustable ? 120 : 2,
        adjustable,
        min_seconds: adjustable ? 60 : 2,
        max_seconds: adjustable ? 300 : 2,
        blocking,
      },
    },
  },
});

function open(blocking = true, adjustable = false) {
  let state: TimerSessionState = createTimer(adjustable ? 120 : 2);
  const onconfirm = vi.fn();
  const props = {
    effect: effect(blocking, adjustable),
    state,
    onconfirm,
    onchange: (next: TimerSessionState) => {
      state = next;
      void view.rerender({ state });
    },
  };
  const view = render(PatternTimer, props);
  return { view, onconfirm, state: () => state };
}
const continued = () => screen.getByRole('button', { name: 'Continue ↓' }) as HTMLButtonElement;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Pattern language timer widget', () => {
  it('blocks early continuation and submits exact completion only on confirmation', async () => {
    const test = open();
    expect(continued().disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(continued().disabled).toBe(true);
    await vi.advanceTimersByTimeAsync(2_000);
    await tick();
    expect(screen.getByText('Timer complete')).toBeTruthy();
    expect(continued().disabled).toBe(false);
    expect(test.onconfirm).not.toHaveBeenCalled();
    await fireEvent.click(continued());
    expect(test.onconfirm).toHaveBeenCalledWith({
      duration_seconds: 2,
      elapsed_seconds: 2,
      completed: true,
    });
  });

  it('uses bounded one-minute buttons only before starting, with an icon-only play button', async () => {
    const test = open(true, true);
    const decrease = screen.getByRole('button', {
      name: 'Decrease timer by one minute',
    }) as HTMLButtonElement;
    const increase = screen.getByRole('button', {
      name: 'Increase timer by one minute',
    }) as HTMLButtonElement;
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.getByText('2 min')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Start timer' }).textContent).toBe('');
    await fireEvent.click(decrease);
    expect(test.state().configuredDurationSeconds).toBe(60);
    expect(decrease.disabled).toBe(true);
    await fireEvent.click(decrease);
    expect(test.state().configuredDurationSeconds).toBe(60);
    for (let i = 0; i < 4; i++) await fireEvent.click(increase);
    expect(test.state().configuredDurationSeconds).toBe(300);
    expect(increase.disabled).toBe(true);
    await fireEvent.click(increase);
    expect(test.state().configuredDurationSeconds).toBe(300);
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(screen.queryByRole('button', { name: 'Increase timer by one minute' })).toBeNull();
    expect(screen.getByText('05:00')).toBeTruthy();
  });

  it('supports pause, resume and reset without silently advancing', async () => {
    const test = open();
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    await vi.advanceTimersByTimeAsync(1_000);
    await fireEvent.click(screen.getByRole('button', { name: 'Pause timer' }));
    await vi.advanceTimersByTimeAsync(10_000);
    expect(screen.getByText('00:01')).toBeTruthy();
    await fireEvent.click(screen.getByRole('button', { name: 'Resume timer' }));
    await fireEvent.click(screen.getByRole('button', { name: 'Reset timer' }));
    expect(screen.getByText('0.03 min')).toBeTruthy();
    expect(continued().disabled).toBe(true);
    expect(test.onconfirm).not.toHaveBeenCalled();
  });

  it('keeps a non-blocking countdown running above the next step', async () => {
    const test = open(false);
    expect(continued().disabled).toBe(true);
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    expect(continued().disabled).toBe(false);
    await fireEvent.click(continued());
    expect(test.onconfirm).toHaveBeenCalledWith({
      duration_seconds: 2,
      elapsed_seconds: 0,
      completed: false,
    });
    await test.view.rerender({ active: false });
    expect(screen.queryByRole('button', { name: 'Continue ↓' })).toBeNull();
    await vi.advanceTimersByTimeAsync(2_000);
    await tick();
    expect(screen.getByText('Timer complete')).toBeTruthy();
    expect(test.onconfirm).toHaveBeenCalledTimes(1);
  });

  it('pauses on run suspension/cancellation and cleans up its interval on leaving', async () => {
    const test = open(false);
    await fireEvent.click(screen.getByRole('button', { name: 'Start timer' }));
    await test.view.rerender({ runningAllowed: false });
    await tick();
    expect(test.state().type).toBe('paused');
    await vi.advanceTimersByTimeAsync(5_000);
    expect(screen.getByText('00:02')).toBeTruthy();
    expect(
      (screen.getByRole('button', { name: 'Resume timer' }) as HTMLButtonElement).disabled,
    ).toBe(true);
    test.view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('never restarts a historical timer or invents a configuration', async () => {
    const view = render(PatternTimer, { effect: effect(false), active: false, onchange: vi.fn() });
    expect(screen.queryByRole('button')).toBeNull();
    expect(vi.getTimerCount()).toBe(0);
    await view.rerender({
      active: true,
      effect: { ...effect(false), request: { kind: 'interaction.timer', payload: {} } },
    });
    expect(screen.getByRole('alert').textContent).toContain('invalid configuration');
    expect(screen.queryByRole('button')).toBeNull();
  });
});

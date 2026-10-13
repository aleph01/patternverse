<script lang="ts">
  import { Clock, Play, Pause, RotateCcw, Check } from '@lucide/svelte';
  import type { PatternEffect } from '$lib/pattern-runtime/types';
  import {
    timerConfig,
    timerCanContinue,
    timerResult,
    formatTimerSeconds,
    formatTimerMinutes,
    type PatternTimerResult,
  } from '$lib/pattern-run/timer';
  import {
    createTimer,
    adjustTimerDuration,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    reconcileTimer,
    remainingTimerSeconds,
    type TimerSessionState,
  } from '$lib/practice/timer';

  let {
    effect: timerEffect,
    state: timerState,
    onchange,
    onconfirm,
    active = true,
    disabled = false,
    runningAllowed = true,
    showContinue = true,
    docked = false,
    showHint = true,
  }: {
    effect: PatternEffect;
    state?: TimerSessionState;
    onchange: (state: TimerSessionState) => void;
    onconfirm?: (result: PatternTimerResult) => void;
    active?: boolean;
    disabled?: boolean;
    runningAllowed?: boolean;
    showContinue?: boolean;
    /** The practice-level dock owns the live widget; this step keeps only its receipt/action. */
    docked?: boolean;
    showHint?: boolean;
  } = $props();
  const config = $derived(timerConfig(timerEffect));
  const timer = $derived(timerState ?? (config ? createTimer(config.duration_seconds) : null));
  let now = $state(Date.now());
  let announcement = $state('');
  const remaining = $derived(timer ? remainingTimerSeconds(timer, now) : 0);
  const controlsDisabled = $derived(disabled || !runningAllowed);
  const status = $derived(
    timer?.type === 'completed'
      ? 'Timer complete'
      : timer?.type === 'paused'
        ? 'Timer paused'
        : 'Timer',
  );

  $effect(() => {
    // Only the visible widget runs a clock. Its state remains owned by the practice.
    if (docked || !timer || timer.type !== 'running') return;
    if (!runningAllowed) {
      onchange(pauseTimer(timer, Date.now()));
      return;
    }
    now = Date.now();
    const interval = window.setInterval(() => {
      now = Date.now();
      const reconciled = reconcileTimer(timer, now);
      if (reconciled.type === 'completed') {
        onchange(reconciled);
        announcement = 'Timer complete. You can continue.';
      }
    }, 250);
    return () => window.clearInterval(interval);
  });

  function adjust(minutes: -1 | 1) {
    if (!config || !timer || timer.type !== 'idle' || !active || controlsDisabled) return;
    const seconds = timer.configuredDurationSeconds + minutes * 60;
    if (seconds < config.min_seconds || seconds > config.max_seconds) return;
    onchange(adjustTimerDuration(timer, seconds));
  }

  function control(action: 'start' | 'pause' | 'resume' | 'reset') {
    if (!timer || controlsDisabled) return;
    now = Date.now();
    const next =
      action === 'start'
        ? startTimer(timer, now)
        : action === 'pause'
          ? pauseTimer(timer, now)
          : action === 'resume'
            ? resumeTimer(timer, now)
            : resetTimer(timer);
    onchange(next);
    announcement = `Timer ${action === 'start' ? 'started' : action === 'pause' ? 'paused' : action === 'resume' ? 'resumed' : 'reset'}.`;
  }
</script>

{#if config && timer}
  {#if active || timerState}
    <section class="pattern-timer" aria-label="Pattern timer">
      {#if docked}
        <p class="timer-receipt">
          {timer.type === 'completed'
            ? 'Timer complete'
            : timer.type === 'idle'
              ? 'Timer ready above'
              : 'Timer started · controls above'}
        </p>
      {:else}
        <div class="timer-widget">
          <Clock size={20} aria-hidden="true" class="timer-icon" />
          <span class="visually-hidden">{status}</span>
          {#if config.adjustable && active && timer.type === 'idle'}
            <button
              type="button"
              class="adjust"
              aria-label="Decrease timer by one minute"
              title="Decrease by one minute"
              disabled={controlsDisabled ||
                timer.configuredDurationSeconds - 60 < config.min_seconds}
              onclick={() => adjust(-1)}>−1</button
            >
          {/if}
          <strong
            class="timer-countdown"
            aria-label={timer.type === 'idle' ? 'Timer duration' : 'Time remaining'}
            >{timer.type === 'idle'
              ? `${Number(Number(formatTimerMinutes(timer.configuredDurationSeconds)).toFixed(2))} min`
              : formatTimerSeconds(remaining)}</strong
          >
          {#if config.adjustable && active && timer.type === 'idle'}
            <button
              type="button"
              class="adjust"
              aria-label="Increase timer by one minute"
              title="Increase by one minute"
              disabled={controlsDisabled ||
                timer.configuredDurationSeconds + 60 > config.max_seconds}
              onclick={() => adjust(1)}>+1</button
            >
          {/if}
          <div class="timer-controls">
            {#if timer.type !== 'completed'}
              <button
                type="button"
                aria-label={timer.type === 'running'
                  ? 'Pause timer'
                  : timer.type === 'paused'
                    ? 'Resume timer'
                    : 'Start timer'}
                title={timer.type === 'running'
                  ? 'Pause timer'
                  : timer.type === 'paused'
                    ? 'Resume timer'
                    : 'Start timer'}
                disabled={controlsDisabled}
                onclick={() =>
                  control(
                    timer.type === 'running'
                      ? 'pause'
                      : timer.type === 'paused'
                        ? 'resume'
                        : 'start',
                  )}
              >
                {#if timer.type === 'running'}<Pause
                    size={20}
                    fill="currentColor"
                    aria-hidden="true"
                  />
                {:else}<Play size={20} fill="currentColor" aria-hidden="true" />{/if}
              </button>
            {:else}<Check size={20} aria-hidden="true" />{/if}
            {#if timer.type !== 'idle'}
              <button
                type="button"
                aria-label="Reset timer"
                title="Reset timer"
                disabled={controlsDisabled}
                onclick={() => control('reset')}
              >
                <RotateCcw size={20} aria-hidden="true" />
              </button>
            {/if}
          </div>
        </div>
      {/if}
      {#if active && showHint && showContinue}
        <p class="timer-hint">
          {config.blocking
            ? 'Continue when the timer finishes.'
            : config.sticky === false
              ? 'Start the timer, then continue. It stays in this step.'
              : 'Start the timer, then continue. It stays above the steps.'}
        </p>
      {/if}
      <p class="visually-hidden" role="status">{announcement}</p>
      {#if active && showContinue}
        <div class="timer-next">
          <button
            class="timer-continue"
            type="button"
            disabled={controlsDisabled || !timerCanContinue(config, timer)}
            onclick={() => onconfirm?.(timerResult(timer!, Date.now()))}>Continue ↓</button
          >
        </div>
      {/if}
    </section>
  {/if}
{:else}<p role="alert">
    This timer has an invalid configuration. You can end the pattern safely.
  </p>{/if}

<style>
  .pattern-timer {
    min-width: 0;
  }
  .timer-widget {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-height: 56px;
    padding: 6px 10px;
    border-radius: 6px;
    background: #181814;
    color: #fff;
  }
  .timer-widget :global(.timer-icon) {
    flex-shrink: 0;
    margin: 0 4px;
  }
  .timer-countdown {
    flex: 1;
    min-width: 0;
    text-align: center;
    white-space: nowrap;
    font-size: 1.375rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.2;
    letter-spacing: -0.025em;
  }
  .timer-controls {
    display: flex;
    align-items: center;
    gap: 2px;
    padding-left: 6px;
    margin-left: 4px;
    border-left: 1px solid #51514d;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .timer-widget button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: #fff;
    font-size: 0.9375rem;
    font-weight: 650;
  }
  .timer-widget button.adjust {
    background: #292925;
  }
  .timer-widget button:hover:not(:disabled) {
    background: #3a3a35;
  }
  button:disabled {
    opacity: 0.35;
    cursor: default;
  }
  button:focus-visible {
    outline: 2px solid #0ac780;
    outline-offset: 2px;
  }
  .timer-receipt,
  .timer-hint {
    margin: 0.65rem 0 0;
    color: #59675c;
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .timer-receipt {
    margin-top: 0;
  }
  .timer-next {
    display: flex;
    justify-content: flex-end;
    margin-top: 1rem;
  }
  .timer-continue {
    min-height: 44px;
    padding: 0.6rem 0.85rem;
    border: 1px solid #181814;
    border-radius: 5px;
    background: #181814;
    color: #fff;
    font-size: 0.875rem;
    font-weight: 650;
  }
  .timer-continue:hover:not(:disabled) {
    background: #34372f;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
  @media (max-width: 360px) {
    .timer-widget {
      gap: 2px;
      padding: 6px;
    }
    .timer-countdown {
      font-size: 1rem;
    }
  }
  @media (max-width: 680px) {
    .timer-continue {
      width: 100%;
    }
  }
</style>

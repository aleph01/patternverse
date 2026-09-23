<script lang="ts">
  import type { TimerPracticeBlock } from '@patternverse/schema';
  import {
    adjustTimerDuration,
    pauseTimer,
    reconcileTimer,
    remainingTimerSeconds,
    resetTimer,
    resumeTimer,
    startTimer,
    type TimerSessionState,
  } from '$lib/practice/timer';

  let {
    block,
    state: timerState,
    onchange,
  }: {
    block: TimerPracticeBlock;
    state: TimerSessionState;
    onchange: (state: TimerSessionState) => void;
  } = $props();

  let now = $state(Date.now());
  let announcement = $state('');
  const remaining = $derived(remainingTimerSeconds(timerState, now));
  const minutesValue = $derived(String(timerState.configuredDurationSeconds / 60));

  $effect(() => {
    if (timerState.type !== 'running') return;
    now = Date.now();
    const interval = window.setInterval(() => {
      now = Date.now();
      const reconciled = reconcileTimer(timerState, now);
      if (reconciled.type === 'completed') {
        onchange(reconciled);
        announcement = 'Timer completed.';
      }
    }, 250);
    return () => window.clearInterval(interval);
  });

  const format = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  };

  const adjustDuration = (value: string): void => {
    const minutes = Number(value);
    if (!Number.isInteger(minutes) || minutes <= 0 || minutes > 1_440) return;
    onchange(adjustTimerDuration(timerState, minutes * 60));
  };

  const stepDuration = (change: number): void => {
    const minutes = Math.round(timerState.configuredDurationSeconds / 60);
    adjustDuration(String(Math.min(1_440, Math.max(1, minutes + change))));
  };

  const start = (): void => {
    onchange(startTimer(timerState, Date.now()));
    announcement = 'Timer started.';
  };

  const pause = (): void => {
    onchange(pauseTimer(timerState, Date.now()));
    announcement = 'Timer paused.';
  };

  const resume = (): void => {
    onchange(resumeTimer(timerState, Date.now()));
    announcement = 'Timer resumed.';
  };

  const reset = (): void => {
    onchange(resetTimer(timerState));
    announcement = 'Timer reset.';
    now = Date.now();
  };
</script>

<section class="practice-timer" aria-label={block.label ?? 'Practice timer'}>
  <p class="practice-timer-label">{block.label ?? 'Timer'}</p>

  <div class="practice-timer-main">
    {#if block.userAdjustable && timerState.type === 'idle'}
      <div class="practice-duration-editor">
        <label>
          <span class="visually-hidden">{block.label ?? 'Timer'} in minutes</span>
          <input
            aria-label={`${block.label ?? 'Timer'} in minutes`}
            type="number"
            inputmode="numeric"
            min="1"
            max="1440"
            step="1"
            value={minutesValue}
            onchange={(event) => adjustDuration(event.currentTarget.value)}
          />
        </label>
        <span aria-hidden="true">:00</span>
        <div class="practice-duration-steppers">
          <button
            type="button"
            aria-label={`Increase ${block.label ?? 'timer'} by one minute`}
            title="Add one minute"
            onclick={() => stepDuration(1)}
          >
            <span class="timer-step-chevron timer-step-chevron--up" aria-hidden="true"></span>
          </button>
          <button
            type="button"
            aria-label={`Decrease ${block.label ?? 'timer'} by one minute`}
            title="Subtract one minute"
            disabled={timerState.configuredDurationSeconds <= 60}
            onclick={() => stepDuration(-1)}
          >
            <span class="timer-step-chevron timer-step-chevron--down" aria-hidden="true"></span>
          </button>
        </div>
      </div>
    {:else}
      <strong class:complete={timerState.type === 'completed'}>
        {timerState.type === 'completed' ? 'Timer complete' : format(remaining)}
      </strong>
    {/if}

    <div class="practice-timer-controls">
      {#if timerState.type === 'idle'}
        <button type="button" aria-label="Start timer" title="Start timer" onclick={start}>
          <span class="timer-control-icon timer-control-icon--play" aria-hidden="true"></span>
        </button>
      {:else if timerState.type === 'running'}
        <button type="button" aria-label="Pause timer" title="Pause timer" onclick={pause}>
          <span class="timer-control-icon timer-control-icon--pause" aria-hidden="true"></span>
        </button>
        <button type="button" aria-label="Reset timer" title="Reset timer" onclick={reset}>
          <span class="timer-control-icon timer-control-icon--reset" aria-hidden="true">↻</span>
        </button>
      {:else if timerState.type === 'paused'}
        <button type="button" aria-label="Resume timer" title="Resume timer" onclick={resume}>
          <span class="timer-control-icon timer-control-icon--play" aria-hidden="true"></span>
        </button>
        <button type="button" aria-label="Reset timer" title="Reset timer" onclick={reset}>
          <span class="timer-control-icon timer-control-icon--reset" aria-hidden="true">↻</span>
        </button>
      {:else}
        <button type="button" aria-label="Reset timer" title="Reset timer" onclick={reset}>
          <span class="timer-control-icon timer-control-icon--reset" aria-hidden="true">↻</span>
        </button>
      {/if}
    </div>
  </div>
  <p class="visually-hidden" aria-live="polite">{announcement}</p>
</section>

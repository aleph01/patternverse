<script lang="ts">
  import type { PatternView } from '$lib/pattern-runtime/types';
  import type { TimerSessionState } from '$lib/practice/timer';
  import { practiceTimerEffects } from '$lib/pattern-run/practice-timers';
  import PatternTimer from './PatternTimer.svelte';

  let {
    view,
    timers,
    dockedIds = $bindable<string[]>([]),
    onchange,
    disabled = false,
    runningAllowed = true,
  }: {
    view: PatternView | null | undefined;
    timers: Record<string, TimerSessionState>;
    dockedIds?: string[];
    onchange: (id: string, state: TimerSessionState) => void;
    disabled?: boolean;
    runningAllowed?: boolean;
  } = $props();
  const effects = $derived(practiceTimerEffects(view));
  // Remember promotion through reset; never manufacture a clock for restored receipts.
  const promoted = $derived(
    effects.filter(
      (effect) =>
        timers[effect.effect_id] &&
        (timers[effect.effect_id].type !== 'idle' || dockedIds.includes(effect.effect_id)),
    ),
  );
  $effect(() => {
    const next = promoted.map((effect) => effect.effect_id);
    if (next.join('\0') !== dockedIds.join('\0')) dockedIds = next;
  });
</script>

{#if promoted.length}
  <aside class="practice-timer-dock" aria-label="Practice timers">
    {#each promoted as effect (effect.effect_id)}
      <div
        class="docked-timer"
        aria-label={promoted.length > 1 ? `Timer ${promoted.indexOf(effect) + 1}` : undefined}
      >
        {#if promoted.length > 1}<p class="timer-title">
            {String(effect.request.payload.prompt ?? 'Timer').split('\n')[0]}
          </p>{/if}
        <PatternTimer
          {effect}
          state={timers[effect.effect_id]}
          showContinue={false}
          showHint={false}
          {disabled}
          {runningAllowed}
          onchange={(state) => onchange(effect.effect_id, state)}
        />
      </div>
    {/each}
  </aside>
{/if}

<style>
  .practice-timer-dock {
    position: sticky;
    top: 8px;
    z-index: 5;
    display: grid;
    gap: 8px;
    max-height: min(30dvh, 15rem);
    overflow-y: auto;
    margin: 0 0 1.25rem;
    padding: 4px;
    border-radius: 8px;
    background: var(--paper, #fff);
  }
  .docked-timer {
    min-width: 0;
  }
  .timer-title {
    margin: 0 0 4px;
    font-size: 12px;
    line-height: 1.4;
    color: var(--muted, #59675c);
  }
</style>

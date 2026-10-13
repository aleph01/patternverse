<script lang="ts">
  import type { PatternView } from '$lib/pattern-runtime/types';
  import type { TimerSessionState } from '$lib/practice/timer';
  import PracticeTimerDock from './PracticeTimerDock.svelte';
  let {
    view,
    initialTimers,
    runningAllowed = true,
    onchange = () => {},
  }: {
    view: PatternView;
    initialTimers: Record<string, TimerSessionState>;
    runningAllowed?: boolean;
    onchange?: (id: string, state: TimerSessionState) => void;
  } = $props();
  let timers = $derived<Record<string, TimerSessionState>>({ ...initialTimers });
  let dockedIds = $state<string[]>([]);
</script>

<PracticeTimerDock
  {view}
  {timers}
  bind:dockedIds
  {runningAllowed}
  onchange={(id, state) => {
    timers = { ...timers, [id]: state };
    onchange(id, state);
  }}
/>

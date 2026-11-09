<script lang="ts">
  import type { MusicExample } from './model';
  import type { Measure } from './timing';
  import { chordTimelineMinimum, displayChords } from './chord-display';
  import ChordLane from './ChordLane.svelte';

  let {
    example,
    bars,
    beat,
    playing,
  }: { example: MusicExample; bars: Measure[]; beat: number; playing: boolean } = $props();
  const start = $derived(bars[0].start);
  const end = $derived(bars.at(-1)!.end);
  const chords = $derived(displayChords(example));
  const minimum = $derived(chordTimelineMinimum(chords, start, end));
  let scroller = $state<HTMLDivElement>();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (Keyboard scrolling of a proportional musical timeline.) -->
<div
  class="harmony-scroll"
  role="region"
  aria-label="Chord timeline"
  tabindex="0"
  bind:this={scroller}
>
  <div class="timeline" style={`min-width:${Math.max(240, minimum)}px`}>
    <div class="bar-labels">
      {#each bars as bar (bar.index)}<span
          style={`width:${((bar.end - bar.start) / (end - start)) * 100}%`}
          >Bar {bar.index + 1}</span
        >{/each}
    </div>
    <ChordLane {chords} {start} {end} {beat} {playing} {scroller} />
  </div>
</div>
<p class="legend">
  Width = time · Select a chord to reveal its notes.<br /><span class="base">Triad</span> ·
  <span class="seventh">Seventh</span>
  · <span class="ninth">Ninth</span>
</p>

<style>
  .harmony-scroll {
    overflow-x: auto;
    border: 1px solid var(--ink);
  }
  .timeline {
    background: var(--paper);
  }
  .bar-labels {
    display: flex;
    font-size: 0.68rem;
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .bar-labels span {
    box-sizing: border-box;
    padding: 8px;
    border-left: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .legend {
    font-size: 0.68rem;
    line-height: 1.8;
    color: var(--muted);
    margin: 10px 0 0;
  }
  .legend span {
    border-bottom: 3px solid var(--layer-color);
    color: var(--ink);
  }
  .base {
    --layer-color: var(--green-dark);
  }
  .seventh {
    --layer-color: var(--blue);
  }
  .ninth {
    --layer-color: var(--coral);
  }
</style>

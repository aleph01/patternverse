<script lang="ts">
  import { untrack } from 'svelte';
  import type { MusicExample } from './model';
  import type { Measure } from './timing';
  import { displayChords } from './chord-display';
  let {
    example,
    bars,
    beat,
    names = false,
    inversions = true,
    disabled = false,
    onseek,
  }: {
    example: MusicExample;
    bars: Measure[];
    beat: number;
    names?: boolean;
    inversions?: boolean;
    disabled?: boolean;
    onseek: (beat: number) => void;
  } = $props();
  const start = $derived(bars[0].start),
    end = $derived(bars.at(-1)!.end);
  const chords = $derived(
    displayChords(example).filter((c) => c.start < end && c.start + c.duration > start),
  );
  const current = $derived(chords.find((c) => beat >= c.start && beat < c.start + c.duration));
  let scroller = $state<HTMLDivElement>();
  $effect(() => {
    const selected = current?.start,
      pane = scroller;
    if (selected === undefined || !pane) return;
    untrack(() => {
      // Keep the selected chord visible in dense passages without moving the page vertically.
      const button = pane.querySelector<HTMLElement>('[aria-pressed="true"]');
      if (button)
        pane.scrollLeft = Math.max(
          0,
          button.offsetLeft + button.offsetWidth / 2 - pane.clientWidth / 2,
        );
    });
  });
  const minimum = $derived(
    Math.max(
      240,
      ...chords.map(
        (c) =>
          ((end - start) / (Math.min(end, c.start + c.duration) - Math.max(start, c.start))) * 60,
      ),
    ),
  );
</script>

<div class="ribbon-scroll" role="region" aria-label="Chord progression" bind:this={scroller}>
  <div class="ribbon" style={`min-width:${minimum}px`}>
    {#each chords as chord, i (`${chord.start}:${i}`)}
      <button
        type="button"
        class="ribbon-chord"
        class:current={current === chord}
        data-family={chord.family}
        data-start={chord.start}
        data-duration={chord.duration}
        style={`left:${((Math.max(start, chord.start) - start) / (end - start)) * 100}%;width:${((Math.min(end, chord.start + chord.duration) - Math.max(start, chord.start)) / (end - start)) * 100}%`}
        aria-pressed={current === chord}
        {disabled}
        aria-label={`${chord.roman}, ${chord.name}, ${chord.functionLabel}, ${chord.duration} beats${chord.name.includes('/') ? `, ${chord.position.toLowerCase()}` : ''}`}
        onclick={() => onseek(Math.max(start, chord.start))}
      >
        <span class="roman">{chord.roman || '—'}</span>
        {#if names}<span class="name">{chord.name}</span>{/if}
        <span class="function">{chord.functionLabel}</span>
        {#if inversions && chord.name.includes('/')}<span class="inversion"
            ><span class="inversion-full">{names ? chord.position : chord.name}</span><span
              class="inversion-compact">{names ? `Bass ${chord.bass}` : chord.name}</span
            ></span
          >{/if}
      </button>
    {/each}
    <div
      class="ribbon-head"
      aria-hidden="true"
      style={`left:${Math.min(100, Math.max(0, ((beat - start) / (end - start)) * 100))}%`}
    ></div>
  </div>
</div>
<p class="current-chord" aria-live="polite">
  {current?.roman} · {current?.functionLabel}{current?.name.includes('/') && inversions
    ? ` · ${current.name} · ${current.position.toLowerCase()}`
    : ''}
</p>
{#if current && current.kind !== 'tonal-centre'}<details class="chord-notes">
    <summary>Chord notes · {current.name}</summary>
    <div class="layers">
      {#each [...current.layers].reverse() as layer (layer.kind)}<div
          class="layer"
          data-layer={layer.kind}
        >
          <span>{layer.label}</span><strong>{layer.notes.join(' · ')}</strong>
        </div>{/each}
    </div>
  </details>{/if}

<style>
  .ribbon-scroll {
    overflow-x: auto;
    min-width: 0;
    container: ribbon / inline-size;
  }
  .ribbon {
    position: relative;
    height: 132px;
    margin-top: 0.3rem;
  }
  .ribbon-chord {
    position: absolute;
    height: 120px;
    border: 3px solid var(--paper);
    border-radius: 13px;
    padding: 12px 3px 26px;
    background: var(--paper);
    color: var(--ink);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    font: inherit;
    cursor: pointer;
    min-width: 0;
  }
  [data-family='home'] {
    --highlight: color-mix(in srgb, var(--green-dark) 14%, var(--paper));
  }
  [data-family='tension'] {
    --highlight: color-mix(in srgb, var(--yellow) 24%, var(--paper));
  }
  [data-family='preparation'] {
    --highlight: color-mix(in srgb, var(--blue) 15%, var(--paper));
  }
  [data-family='other'] {
    --highlight: color-mix(in srgb, var(--ink) 7%, var(--paper));
  }
  .ribbon-chord.current {
    background: var(--highlight);
  }
  .ribbon-chord:hover:not(:disabled) {
    background: color-mix(in srgb, var(--highlight) 65%, var(--paper));
  }
  .roman {
    font-size: 1.8rem;
    font-weight: 600;
    line-height: 1.1;
  }
  .name {
    font-size: 0.76rem;
  }
  .function {
    font-size: 0.72rem;
    color: var(--muted);
    text-align: center;
    max-width: 100%;
    overflow-wrap: anywhere;
    line-height: 1.15;
  }
  .inversion {
    position: absolute;
    bottom: 5px;
    font-size: 0.67rem;
    border-radius: 4px;
    padding: 2px 5px;
    background: color-mix(in srgb, var(--ink) 5%, var(--paper));
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .inversion-compact {
    display: none;
  }
  .ribbon-head {
    position: absolute;
    bottom: 0;
    height: 5px;
    width: 2px;
    background: var(--ink);
    opacity: 0.6;
    pointer-events: none;
  }
  .current-chord {
    text-align: center;
    margin: 0.3rem 0;
    font-size: 0.72rem;
    color: var(--muted);
    min-height: 1.5em;
  }
  .chord-notes {
    font-size: 0.72rem;
  }
  summary {
    min-height: 44px;
    align-content: center;
    color: var(--muted);
    cursor: pointer;
  }
  .layers {
    display: grid;
    gap: 4px;
  }
  .layer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 0.75rem;
    border-radius: 5px;
    background: color-mix(in srgb, var(--green-dark) 13%, var(--paper));
  }
  [data-layer='seventh'] {
    background: color-mix(in srgb, var(--blue) 15%, var(--paper));
  }
  [data-layer='ninth'] {
    background: color-mix(in srgb, var(--coral) 16%, var(--paper));
  }
  strong {
    font-weight: 500;
  }
  button:focus-visible,
  summary:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: -2px;
  }
  @container ribbon (max-width:480px) {
    .inversion-full {
      display: none;
    }
    .inversion-compact {
      display: inline;
    }
    .name {
      font-size: 0.7rem;
      max-width: 100%;
      overflow-wrap: anywhere;
      text-align: center;
    }
    .function {
      display: none;
    }
    .roman {
      font-size: 1.6rem;
    }
  }
</style>

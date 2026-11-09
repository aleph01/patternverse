<script lang="ts">
  import type { DisplayChord } from './chord-display';

  let {
    chords,
    start,
    end,
    beat,
    playing,
    scroller,
  }: {
    chords: DisplayChord[];
    start: number;
    end: number;
    beat: number;
    playing: boolean;
    scroller?: HTMLDivElement;
  } = $props();
  const uid = $props.id();
  const span = $derived(end - start);
  const visible = $derived(chords.filter((h) => h.start < end && h.start + h.duration > start));
  const current = $derived(
    playing ? visible.findIndex((h) => beat >= h.start && beat < h.start + h.duration) : -1,
  );
  let lane = $state<HTMLDivElement>();
  let laneHeight = $state(140);

  $effect(() => {
    if (!lane) return;
    // Native disclosures grow vertically, independently of the beat-proportional widths.
    void visible;
    const blocks = [...lane.querySelectorAll<HTMLElement>('.harmony-chord')];
    const measure = () => {
      laneHeight = Math.max(
        140,
        ...blocks.map((block) => Math.ceil(block.getBoundingClientRect().height)),
      );
    };
    const observer = new ResizeObserver(measure);
    blocks.forEach((block) => observer.observe(block));
    measure();
    return () => observer.disconnect();
  });

  // Follow a new chord only within the musical scroller; never move the whole page.
  $effect(() => {
    const index = current;
    if (index < 0 || !lane || !scroller) return;
    const node = lane.querySelectorAll<HTMLElement>('.harmony-chord')[index];
    if (!node) return;
    const bounds = node.getBoundingClientRect();
    const viewport = scroller.getBoundingClientRect();
    if (bounds.left < viewport.left || bounds.right > viewport.right)
      scroller.scrollLeft += bounds.left - viewport.left - 8;
  });
</script>

<div
  class="harmony-track"
  aria-label="Roman numerals and chord names"
  bind:this={lane}
  style={`height:${laneHeight}px`}
>
  {#each visible as chord, i (`${chord.start}:${i}`)}
    <details
      class="harmony-chord"
      class:current={playing && beat >= chord.start && beat < chord.start + chord.duration}
      data-family={chord.family}
      data-start={chord.start}
      data-duration={chord.duration}
      style={`left:${((Math.max(start, chord.start) - start) / span) * 100}%;width:${((Math.min(end, chord.start + chord.duration) - Math.max(start, chord.start)) / span) * 100}%`}
    >
      <summary
        aria-label={`${chord.romanLabel || chord.name}, ${chord.name}, ${chord.duration} ${chord.duration === 1 ? 'beat' : 'beats'}${chord.bass ? `, bass ${chord.bass}, ${chord.position.toLowerCase()}` : ''}. Show chord notes`}
      >
        <span class="identity"
          ><strong>{chord.romanLabel || '—'}</strong><small>{chord.name}</small></span
        >
        {#if chord.functionLabel}<span class="function">{chord.functionLabel}</span>{/if}
        <span class="duration"
          >{chord.duration}
          {chord.duration === 1 ? 'beat' : 'beats'}
          <span class="expand" aria-hidden="true">+</span></span
        >
        <span class="bass"><span>Bass</span> <b>{chord.bass ?? '—'}</b></span>
      </summary>
      <div class="chord-layers" id={`${uid}-layers-${i}`}>
        {#if chord.layers.length}
          {#each [...chord.layers].reverse() as layer (layer.kind)}
            <div class="layer" data-layer={layer.kind}>
              <span class="layer-label">{layer.label}</span>
              <span class="tones"
                >{#each layer.notes as note (note)}<span>{note}</span>{/each}</span
              >
            </div>
          {/each}
        {:else}<p class="unavailable">No chord notes supplied.</p>{/if}
        <p class="inversion-note">
          {chord.bass ? chord.position : 'Bass not supplied'}{chord.source === 'symbol'
            ? ' · from chord symbol'
            : ''}
        </p>
      </div>
    </details>
  {/each}
  {#if beat >= start && beat <= end}
    <div
      class="chord-playhead"
      aria-hidden="true"
      style={`left:${Math.min(99.8, ((beat - start) / span) * 100)}%`}
    ></div>
  {/if}
</div>

<style>
  .harmony-track {
    position: relative;
    height: 140px;
    color: var(--ink);
    background: var(--paper);
    --chord-line: color-mix(in srgb, var(--ink) 22%, transparent);
  }
  .harmony-chord {
    box-sizing: border-box;
    position: absolute;
    inset-block-start: 0;
    min-width: 0;
    border: 1px solid var(--chord-line);
    background: var(--paper);
    --family: var(--ink);
  }
  [data-family='home'] {
    --family: var(--green-dark);
  }
  [data-family='preparation'] {
    --family: var(--blue);
  }
  [data-family='tension'] {
    --family: #b27a00;
  }
  summary {
    box-sizing: border-box;
    height: 140px;
    padding: 12px 8px 0;
    display: flex;
    flex-direction: column;
    cursor: pointer;
    list-style: none;
    background: color-mix(in srgb, var(--family) 8%, var(--paper));
    border-top: 3px solid var(--family);
    font: inherit;
    text-align: left;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: -4px;
  }
  .identity {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 3px 10px;
  }
  strong {
    font-size: 1.35rem;
    letter-spacing: -0.04em;
    line-height: 1.15;
  }
  small {
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }
  .function {
    font-size: 0.65rem;
    line-height: 1.2;
    margin-top: 4px;
  }
  .duration {
    font-size: 0.62rem;
    margin: auto 0 8px;
    display: flex;
    justify-content: space-between;
    gap: 4px;
  }
  .expand {
    font-size: 0.85rem;
    line-height: 1;
  }
  details[open] .expand {
    transform: rotate(45deg);
  }
  .bass {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 4px;
    margin: 0 -8px;
    padding: 6px 8px;
    border-top: 1px solid var(--chord-line);
    background: color-mix(in srgb, var(--ink) 5%, var(--paper));
    font-size: 0.62rem;
  }
  .bass b {
    font-size: 0.8rem;
  }
  .current summary {
    box-shadow: inset 0 0 0 2px var(--ink);
    background: color-mix(in srgb, var(--family) 20%, var(--paper));
  }
  .chord-layers {
    padding: 8px 6px;
    display: grid;
    gap: 5px;
  }
  .layer {
    padding: 7px 6px;
    border-left: 3px solid var(--layer-color);
    background: color-mix(in srgb, var(--layer-color) 10%, var(--paper));
  }
  [data-layer='base'] {
    --layer-color: var(--green-dark);
  }
  [data-layer='seventh'] {
    --layer-color: var(--blue);
  }
  [data-layer='ninth'] {
    --layer-color: var(--coral);
  }
  [data-layer='other'] {
    --layer-color: var(--muted);
  }
  .layer-label {
    display: block;
    font-size: 0.6rem;
    line-height: 1.3;
    margin-bottom: 4px;
  }
  .tones {
    display: flex;
    flex-wrap: wrap;
    gap: 3px 7px;
    font-size: 0.76rem;
    font-weight: 700;
  }
  .inversion-note,
  .unavailable {
    font-size: 0.6rem;
    line-height: 1.4;
    margin: 4px 2px;
    overflow-wrap: anywhere;
  }
  .chord-playhead {
    position: absolute;
    inset-block: 0;
    width: 2px;
    background: var(--ink);
    z-index: 2;
    pointer-events: none;
  }
</style>

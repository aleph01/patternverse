<script lang="ts">
  import { untrack, type Snippet } from 'svelte';
  import { Volume2, VolumeX } from '@lucide/svelte';
  import type { MusicExample } from './model';
  import { formLayers, formSections } from './form';
  import { measuresFor } from './timing';
  let {
    example,
    beat,
    playing,
    onseek,
    disabled = false,
    expanded = false,
    children,
    parts = [],
    ontoggleparts,
    canMute = true,
  }: {
    example: MusicExample;
    beat: number;
    playing: boolean;
    onseek: (beat: number) => void;
    disabled?: boolean;
    expanded?: boolean;
    children?: Snippet;
    parts?: string[];
    ontoggleparts?: (ids: string[]) => void;
    canMute?: boolean;
  } = $props();
  const sections = $derived(formSections(example));
  const layers = $derived(formLayers(example));
  const measures = $derived(measuresFor(example));
  const current = $derived(sections.findIndex((s) => beat >= s.start && beat < s.end));
  let width = $state(700),
    scroller = $state<HTMLDivElement>();
  const minimumWidth = $derived(
    Math.max(
      width,
      ...sections.map(
        (section) =>
          (Math.max(76, section.label.length * 6.5 + 24) * example.beats) /
          (section.end - section.start),
      ),
    ),
  );
  $effect(() => {
    const selected = current,
      pane = scroller;
    void minimumWidth;
    if (selected < 0 || !pane) return;
    untrack(() => {
      const button = pane.querySelector<HTMLElement>('[aria-current="step"]');
      if (button)
        pane.scrollLeft = Math.max(
          0,
          button.offsetLeft + button.offsetWidth / 2 - pane.clientWidth / 2,
        );
    });
  });
  function spanLabel(start: number, end: number) {
    const bars = measures.filter((b) => b.start < end && b.end > start);
    return bars.length
      ? `bars ${bars[0].index + 1}–${bars.at(-1)!.index + 1}`
      : `${end - start} beats`;
  }
</script>

<div class="form-timeline" class:playing>
  <!-- svelte-ignore a11y_no_noninteractive_tabindex (This region supports horizontal keyboard scrolling.) -->
  <div
    class="section-scroll"
    role="region"
    aria-label="Song sections"
    tabindex="0"
    bind:this={scroller}
    bind:clientWidth={width}
  >
    <div class="section-track" aria-label="Song structure" style={`min-width:${minimumWidth}px`}>
      {#each sections as section, i (`${section.start}:${i}`)}
        <button
          type="button"
          class="form-section"
          class:current={current === i}
          aria-current={current === i ? 'step' : undefined}
          aria-expanded={expanded && current === i}
          {disabled}
          style={`left:${(section.start / example.beats) * 100}%;width:${((section.end - section.start) / example.beats) * 100}%`}
          aria-label={`Explore ${section.label}, ${spanLabel(section.start, section.end)}`}
          onclick={() => onseek(section.start)}
        >
          <span class="section-name"><span>{section.label}</span></span>
        </button>
      {/each}
      <div
        class="form-playhead"
        aria-hidden="true"
        style={`left:${Math.min(100, Math.max(0, (beat / example.beats) * 100))}%`}
      ></div>
    </div>
  </div>
  {#if children}{@render children()}{/if}
  <details class="form-detail">
    <summary>Instrument layers</summary>
    {#if ontoggleparts && !canMute}<p class="mute-help">
        Switch to MIDI study to mute individual instruments.
      </p>{/if}
    {#if ontoggleparts && canMute && layers.length && !layers.some( (layer) => layer.parts.some( (id) => parts.includes(id) ) )}
      <p class="mute-help" role="status">
        All instruments are muted. Switch one back on to hear it.
      </p>
    {/if}
    {#each layers as layer (layer.id)}
      {@const muted = !layer.parts.some((id) => parts.includes(id))}
      <div class="layer-heading">
        <span class="layer-label">{layer.label}</span>
        {#if ontoggleparts}
          <button
            type="button"
            class="mute-button"
            aria-label={`Mute ${layer.label}`}
            aria-pressed={muted}
            title={canMute
              ? `${muted ? 'Unmute' : 'Mute'} ${layer.label}`
              : 'Instrument muting is available with MIDI playback'}
            disabled={disabled || !canMute}
            onclick={() => ontoggleparts?.(layer.parts)}
          >
            {#if muted}<VolumeX size={17} aria-hidden="true" />{:else}<Volume2
                size={17}
                aria-hidden="true"
              />{/if}
          </button>
        {/if}
      </div>
      <div
        class="form-lane"
        class:muted={Boolean(ontoggleparts) && muted}
        role="img"
        aria-label={`${layer.label}: ${layer.spans.length ? `first enters at beat ${layer.spans[0].start + 1}` : 'silent'}`}
      >
        {#each layer.spans as span, i (i)}<span
            class="layer-span"
            style={`left:${(span.start / example.beats) * 100}%;width:${((span.end - span.start) / example.beats) * 100}%`}
          ></span>{/each}
      </div>
    {/each}
  </details>
</div>

<style>
  .form-timeline {
    min-width: 0;
  }
  .section-scroll {
    overflow-x: auto;
    scrollbar-width: thin;
    padding-bottom: 5px;
  }
  .section-track {
    height: 44px;
    position: relative;
  }
  .form-section {
    position: absolute;
    top: 0;
    height: 44px;
    padding: 0 6px;
    border: 0;
    border-right: 4px solid var(--paper);
    border-radius: 5px;
    background: color-mix(in srgb, var(--ink) 5%, var(--paper));
    color: var(--ink);
    font: inherit;
    cursor: pointer;
    min-width: 0;
  }
  .section-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.75rem;
    font-weight: 500;
    text-align: center;
  }
  .form-section.current {
    background: color-mix(in srgb, var(--blue) 20%, var(--paper));
  }
  .form-section:hover:not(:disabled) {
    background: color-mix(in srgb, var(--blue) 12%, var(--paper));
  }
  .form-section:focus-visible,
  .section-scroll:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: -2px;
  }
  .form-playhead {
    position: absolute;
    bottom: 0;
    height: 4px;
    width: 3px;
    background: var(--ink);
    pointer-events: none;
  }
  summary {
    cursor: pointer;
    min-height: 44px;
    align-content: center;
    font-size: 0.73rem;
    color: var(--muted);
  }
  .layer-label {
    font-size: 0.7rem;
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .layer-heading {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    min-height: 44px;
  }
  .mute-button {
    display: grid;
    place-items: center;
    flex: 0 0 44px;
    width: 44px;
    height: 44px;
    padding: 0;
    color: var(--green-dark);
    background: transparent;
    border: 0;
    border-radius: 5px;
    cursor: pointer;
  }
  .mute-button[aria-pressed='true'] {
    color: var(--muted);
    background: color-mix(in srgb, var(--ink) 6%, var(--paper));
  }
  .mute-button:hover:not(:disabled) {
    background: color-mix(in srgb, var(--green-dark) 10%, var(--paper));
  }
  .mute-button:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: -2px;
  }
  .mute-button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .mute-help {
    font-size: 0.73rem;
    color: var(--muted);
  }
  .form-lane {
    position: relative;
    height: 12px;
    background: color-mix(in srgb, var(--ink) 4%, var(--paper));
    border-radius: 3px;
  }
  .layer-span {
    position: absolute;
    inset-block: 0;
    min-width: 1px;
    background: var(--green-dark);
    opacity: 0.55;
    border-radius: 2px;
    transition: opacity 100ms;
  }
  .form-lane.muted .layer-span {
    opacity: 0.15;
  }
</style>

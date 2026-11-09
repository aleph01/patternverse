<script lang="ts">
  import type { MusicExample } from './model';
  import { tracksFor } from './model';
  import { pitchLabel } from './examples';
  import type { Measure } from './timing';
  import { chordTimelineMinimum, displayChords } from './chord-display';
  import ChordLane from './ChordLane.svelte';
  let {
    example,
    bars,
    parts,
    beat,
    playing,
    height,
  }: {
    example: MusicExample;
    bars: Measure[];
    parts: string[];
    beat: number;
    playing: boolean;
    height?: number;
  } = $props();
  const start = $derived(bars[0].start),
    end = $derived(bars.at(-1)!.end),
    span = $derived(end - start);
  const tracks = $derived(tracksFor(example));
  const pitched = $derived(
    example.notes.filter((n) => !n.drum && !tracks.find((t) => t.id === n.part)?.drum),
  );
  const low = $derived(pitched.length ? Math.min(...pitched.map((n) => n.midi)) - 1 : 0);
  const high = $derived(pitched.length ? Math.max(...pitched.map((n) => n.midi)) + 1 : 0);
  const pitches = $derived(
    pitched.length ? Array.from({ length: high - low + 1 }, (_, i) => high - i) : [],
  );
  const gridHeight = $derived(height ?? Math.max(180, pitches.length * 17));
  const drums = $derived(tracks.filter((t) => t.drum));
  const visible = $derived(
    example.notes.filter((n) => n.start < end && n.start + n.duration > start),
  );
  const harmonies = $derived(displayChords(example));
  const harmonyMinimum = $derived(chordTimelineMinimum(harmonies, start, end));
  let scroller = $state<HTMLDivElement>();
</script>

<!-- svelte-ignore a11y_no_noninteractive_tabindex (The focusable region supports horizontal keyboard scrolling.) -->
<div
  class="roll-scroll"
  role="region"
  aria-label="Piano roll: higher notes are higher; longer blocks last longer"
  tabindex="0"
  bind:this={scroller}
>
  <div
    class="roll"
    class:compact={height !== undefined && height / pitches.length < 14}
    style={`--minimum:${Math.max(bars.length === 1 ? 240 : 400, harmonyMinimum ? harmonyMinimum + 48 : 0)}px;--span:${span}`}
  >
    <div></div>
    <div class="bar-labels">
      {#each bars as bar (bar.index)}<span style={`width:${((bar.end - bar.start) / span) * 100}%`}
          >Bar {bar.index + 1}</span
        >{/each}
    </div>
    {#if harmonies.some((h) => h.start < end && h.start + h.duration > start)}<div></div>
      <ChordLane chords={harmonies} {start} {end} {beat} {playing} {scroller} />{/if}
    {#if pitches.length}
      <div
        class="pitch-labels"
        aria-hidden="true"
        style={`height:${gridHeight}px;grid-template-rows:repeat(${pitches.length},minmax(0,1fr))`}
      >
        {#each pitches as pitch (pitch)}<span class:octave={pitch % 12 === 0}
            >{pitched.find((n) => n.midi === pitch)?.pitch ?? pitchLabel(pitch)}</span
          >{/each}
      </div>
      <div
        class="note-grid"
        role="img"
        aria-label={`${example.title}, ${pitched.length} pitched notes across ${example.beats} beats`}
        style={`height:${gridHeight}px`}
      >
        {#each pitches as pitch, i (pitch)}<div
            class="pitch-row"
            class:accidental={[1, 3, 6, 8, 10].includes(pitch % 12)}
            style={`top:${(i / pitches.length) * 100}%;height:${100 / pitches.length}%`}
          ></div>{/each}
        {#each visible.filter((n) => !n.drum && !drums.some((t) => t.id === n.part)) as note (note)}
          <div
            class="note"
            class:chord={note.part === 'chords' || note.part === 'accompaniment'}
            class:muted={!parts.includes(note.part)}
            class:sounding={playing &&
              parts.includes(note.part) &&
              beat >= note.start &&
              beat < note.start + note.duration}
            style={`left:${((Math.max(start, note.start) - start) / span) * 100}%;width:${((Math.min(end, note.start + note.duration) - Math.max(start, note.start)) / span) * 100}%;top:${((high - note.midi) / pitches.length) * 100}%;height:${100 / pitches.length}%`}
            title={`${note.pitch}, ${note.duration} beats · ${tracks.find((t) => t.id === note.part)?.label}`}
          >
            <span>{note.pitch}</span>
          </div>
        {/each}
        {#if beat >= start && beat <= end}<div
            class="playhead"
            style={`left:${Math.min(99.8, ((beat - start) / span) * 100)}%`}
          ></div>{/if}
      </div>
    {/if}
    {#each drums as track (track.id)}
      <span class="drum-label">{track.label}</span>
      <div class="drum-lane" class:muted={!parts.includes(track.id)}>
        {#each visible.filter((n) => n.part === track.id) as note (note)}<div
            class="drum-hit"
            class:sounding={playing &&
              parts.includes(track.id) &&
              beat >= note.start &&
              beat < note.start + 0.15}
            style={`left:${((note.start - start) / span) * 100}%`}
            title={`${track.label}, beat ${note.start + 1}`}
          ></div>{/each}
        {#if beat >= start && beat <= end}<div
            class="playhead"
            style={`left:${Math.min(99.8, ((beat - start) / span) * 100)}%`}
          ></div>{/if}
      </div>
    {/each}
  </div>
</div>

<style>
  .roll-scroll {
    overflow-x: auto;
    border: 1px solid var(--ink);
  }
  .roll {
    min-width: var(--minimum);
    display: grid;
    grid-template-columns: 48px 1fr;
    background: var(--paper);
  }
  .bar-labels {
    display: flex;
    min-height: 32px;
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
    font-size: 0.7rem;
  }
  .bar-labels span {
    box-sizing: border-box;
    padding: 0.4rem;
    border-left: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .pitch-labels {
    display: grid;
    font-size: 0.65rem;
    text-align: center;
    border-right: 1px solid color-mix(in srgb, var(--ink) 25%, transparent);
  }
  .pitch-labels span {
    display: grid;
    place-items: center;
    min-height: 0;
    line-height: 1;
  }
  .compact .pitch-labels span:not(.octave) {
    visibility: hidden;
  }
  .compact .note span {
    display: none;
  }
  .note-grid,
  .drum-lane {
    position: relative;
    background: repeating-linear-gradient(
      to right,
      transparent 0,
      transparent calc(100% / var(--span) - 1px),
      color-mix(in srgb, var(--ink) 12%, transparent) calc(100% / var(--span) - 1px),
      color-mix(in srgb, var(--ink) 12%, transparent) calc(100% / var(--span))
    );
  }
  .pitch-row {
    position: absolute;
    width: 100%;
    border-bottom: 1px solid color-mix(in srgb, var(--ink) 8%, transparent);
  }
  .pitch-row.accidental {
    background: color-mix(in srgb, var(--ink) 4%, transparent);
  }
  .note {
    position: absolute;
    box-sizing: border-box;
    padding: 1px;
    background-clip: content-box;
    background-color: var(--green-dark);
    color: var(--paper);
    border-radius: 2px;
    overflow: hidden;
    font-size: 0.65rem;
    line-height: 1;
    display: flex;
    align-items: center;
    min-width: 2px;
  }
  .note span {
    padding-left: 4px;
    white-space: nowrap;
  }
  .note.chord {
    background-color: color-mix(in srgb, var(--ink) 70%, var(--paper));
  }
  .note.sounding,
  .drum-hit.sounding {
    background-color: var(--ink);
    color: var(--paper);
    outline: 2px solid var(--green-dark);
    outline-offset: 1px;
    z-index: 2;
  }
  .muted {
    opacity: 0.2;
  }
  .playhead {
    position: absolute;
    inset-block: 0;
    width: 2px;
    background: var(--ink);
    z-index: 3;
    pointer-events: none;
  }
  .drum-label {
    padding: 0.7rem 0.2rem;
    font-size: 0.65rem;
    overflow-wrap: anywhere;
    border-top: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .drum-lane {
    height: 44px;
    border-top: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .drum-hit {
    position: absolute;
    top: 14px;
    width: 7px;
    height: 16px;
    background: var(--green-dark);
  }
</style>

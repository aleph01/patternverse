<script lang="ts">
  import type { MusicExample, Note } from './model';
  import { tracksFor } from './model';
  import type { Measure } from './timing';
  import { drumSubdivision, subdivisionLabel, subdivisionCount } from './rhythm-grid';
  let {
    example,
    bars,
    parts,
    beat,
    playing,
    onedit,
    compact = false,
  }: {
    example: MusicExample;
    bars: Measure[];
    parts: string[];
    beat: number;
    playing: boolean;
    onedit?: (track: string, start: number) => void;
    compact?: boolean;
  } = $props();
  let width = $state(700);
  const tracks = $derived(tracksFor(example).filter((t) => t.drum));
  const hit = (track: string, start: number): Note | undefined =>
    example.notes.find((n) => n.part === track && Math.abs(n.start - start) < 0.015);
</script>

<div class="beat-grid" class:compact bind:clientWidth={width}>
  {#each bars as bar (bar.index)}
    {@const subdivision = drumSubdivision(example.notes, bar.start, bar.end)}
    {@const count = Math.ceil((bar.end - bar.start) * subdivision)}
    {@const size = compact
      ? Math.max(1, count <= 16 ? count : subdivision)
      : width < 500
        ? 4
        : subdivision === 3
          ? 6
          : 8}
    {#each Array.from({ length: Math.ceil(count / size) }, (_, i) => i * size) as chunk (chunk)}
      {@const slots = Array.from(
        { length: Math.min(size, count - chunk) },
        (_, i) => bar.start + (chunk + i) / subdivision,
      )}
      <div class="chunk" style={`--columns:${slots.length}`}>
        <div class="chunk-title">
          <span>Bar {bar.index + 1}{chunk > 0 ? ' · continued' : ''}</span><span
            >{subdivisionLabel(subdivision)}</span
          >
        </div>
        <div class="grid-row counts">
          <span></span>{#each slots as start (start)}<span
              >{subdivisionCount(start - bar.start, subdivision)}</span
            >{/each}
        </div>
        {#each tracks as track (track.id)}
          <div class="grid-row" class:muted={!parts.includes(track.id)}>
            <span class="track-label">{track.label}</span>
            {#each slots as start (start)}
              {@const active = hit(track.id, start)}
              <button
                type="button"
                class:hit={!!active}
                class:now={playing && beat >= start && beat < start + 1 / subdivision}
                aria-label={`${track.label}, bar ${bar.index + 1}, beat ${(start - bar.start + 1).toFixed(2)}`}
                aria-pressed={!!active}
                disabled={!onedit}
                onclick={() => onedit?.(track.id, start)}
                >{#if active}<span class="dot"></span>{/if}</button
              >
            {/each}
          </div>
        {/each}
      </div>
    {/each}
  {/each}
</div>

<style>
  .beat-grid {
    border: 1px solid var(--ink);
    min-width: 0;
  }
  .chunk {
    padding: 1rem;
  }
  .chunk + .chunk {
    border-top: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
  }
  .chunk-title {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.7rem;
    color: var(--muted);
    margin-bottom: 0.75rem;
  }
  .grid-row {
    display: grid;
    grid-template-columns: 64px repeat(var(--columns), minmax(0, 1fr));
    gap: 6px;
    margin-top: 6px;
    align-items: center;
  }
  .counts {
    text-align: center;
    font-size: 0.7rem;
    margin-bottom: 0.6rem;
  }
  .track-label {
    font-size: 0.73rem;
    overflow-wrap: anywhere;
  }
  button {
    display: grid;
    place-items: center;
    min-width: 0;
    min-height: 38px;
    border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
    background: color-mix(in srgb, var(--ink) 4%, var(--paper));
    color: var(--ink);
    cursor: pointer;
    border-radius: 0;
  }
  button:disabled {
    cursor: default;
  }
  button.hit {
    border-color: var(--green-dark);
    background: var(--mint);
    color: var(--green-dark);
  }
  button.now {
    outline: 2px solid var(--green-dark);
    outline-offset: 1px;
  }
  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: currentColor;
  }
  .muted {
    opacity: 0.3;
  }
  .compact {
    border: 0;
  }
  .compact .chunk {
    padding: 0;
  }
  .compact .chunk-title {
    display: none;
  }
  .compact .grid-row {
    grid-template-columns: 46px repeat(var(--columns), minmax(0, 1fr));
    gap: 4px;
  }
  .compact button {
    min-height: 24px;
    border: 0;
    border-radius: 4px;
  }
  .compact button.hit {
    background: color-mix(in srgb, var(--blue) 18%, var(--paper));
  }
  .compact button.now {
    outline: 0;
    background: color-mix(in srgb, var(--ink) 25%, var(--paper));
  }
  @media (pointer: coarse) {
    button {
      min-height: 44px;
    }
  }
  @media (max-width: 500px) {
    .chunk {
      padding: 0.7rem;
    }
    .grid-row {
      grid-template-columns: 56px repeat(var(--columns), minmax(0, 1fr));
      gap: 5px;
    }
  }
</style>

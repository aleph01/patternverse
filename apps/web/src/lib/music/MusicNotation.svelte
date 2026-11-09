<script lang="ts">
  import { onMount } from 'svelte';
  import type { MusicExample } from './model';
  import type { Measure } from './timing';
  import { drawNotation, type ScoreMarker } from './notation';
  import type * as Vex from 'vexflow';

  let {
    example,
    bars,
    parts,
    beat,
    playing,
  }: { example: MusicExample; bars: Measure[]; parts: string[]; beat: number; playing: boolean } =
    $props();
  let container: HTMLDivElement;
  let width = $state(0),
    error = $state(''),
    loaded = $state(false);
  let VF: typeof Vex;
  let markers: ScoreMarker[] = [];
  onMount(() => {
    let live = true,
      resizeFrame = 0,
      measured = 0;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next === measured) return;
      measured = next;
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => (width = next));
    });
    observer.observe(container);
    import('vexflow')
      .then((module) => {
        if (live) {
          VF = module;
          loaded = true;
        }
      })
      .catch(() => {
        if (live) error = 'Notation could not load. The piano roll is still available.';
      });
    return () => {
      live = false;
      observer.disconnect();
      cancelAnimationFrame(resizeFrame);
    };
  });
  $effect(() => {
    if (!loaded || width < 100) return;
    error = '';
    markers = [];
    try {
      markers = drawNotation(container, VF, example, bars, parts, width);
    } catch (e) {
      // eslint-disable-next-line svelte/no-dom-manipulating -- VexFlow owns this empty rendering container.
      container.replaceChildren();
      error =
        e instanceof Error
          ? e.message
          : 'This score needs reviewed annotation. The piano roll is still available.';
    }
  });
  $effect(() => {
    void width;
    void loaded;
    void parts;
    void bars;
    void example;
    for (const marker of markers) {
      const active = playing && beat >= marker.start && beat < marker.end;
      marker.line.setAttribute('visibility', active ? 'visible' : 'hidden');
      if (active) {
        const i = Math.max(
          0,
          marker.starts.findLastIndex((start) => start <= beat),
        );
        const start = marker.starts[i],
          next = marker.starts[i + 1] ?? marker.end;
        const x =
          marker.xs[i] +
          (((marker.xs[i + 1] ?? marker.right) - marker.xs[i]) * (beat - start)) / (next - start);
        marker.line.setAttribute('x1', String(x));
        marker.line.setAttribute('x2', String(x));
      }
    }
  });
</script>

<div class="notation" bind:this={container}></div>
{#if !loaded && !error}<p class="notice" role="status">Loading notation…</p>{/if}
{#if error}<p class="notice" role="status">{error}</p>{/if}
{#if !parts.length}<p class="notice">Switch on a part to see its notation.</p>{/if}

<style>
  .notation {
    width: 100%;
    min-width: 0;
    color: var(--ink);
    overflow: hidden;
  }
  .notation :global(svg) {
    display: block;
    max-width: 100%;
    height: auto;
  }
  .notice {
    font-size: 0.82rem;
    line-height: 1.5;
    padding: 1rem;
    margin: 0;
  }
</style>

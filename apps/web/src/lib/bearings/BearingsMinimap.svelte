<script lang="ts">
  import { tick } from 'svelte';
  import type { BearingsCell as Cell } from '@patternverse/workspace';
  import { noteBody, textKinds } from './outline';
  import BearingsMarkdown from './BearingsMarkdown.svelte';

  let {
    viewport,
    cells,
    activeId,
    enabled,
    onselect,
    onvisibility,
  }: {
    viewport: HTMLDivElement | null;
    cells: readonly Cell[];
    activeId: string | null;
    enabled: boolean;
    onselect: (id: string) => void;
    onvisibility: (visible: boolean) => void;
  } = $props();
  let visible = $state(false),
    top = $state(0),
    height = $state(0),
    inView = $state<string[]>([]),
    hovered = $state<string | null>(null),
    focusIndex = $state(0);
  let rail = $state<HTMLElement>(null!);
  let reported = false;
  const step = $derived(cells.length ? height / cells.length : 0);
  const preview = $derived(cells.find((cell) => cell.id === hovered));
  const previewIndex = $derived(cells.findIndex((cell) => cell.id === hovered));
  const previewTop = $derived(
    Math.min(Math.max(0, (previewIndex + 0.5) * step - 56), Math.max(0, height - 180)),
  );
  function show(next: boolean) {
    visible = next;
    if (!next) hovered = null;
    if (reported !== next) {
      reported = next;
      onvisibility(next);
    }
  }
  $effect(() => {
    const container = viewport,
      items = cells;
    if (!container || !enabled || items.length < 8) {
      show(false);
      return;
    }
    const target: HTMLDivElement = container;
    const desktop = window.matchMedia('(min-width: 900px) and (pointer: fine)');
    let frame = 0;
    const nodes = Array.from(target.querySelectorAll<HTMLElement>('.notebook-cell'));
    function measure() {
      frame = 0;
      const available = target.clientHeight - 48;
      const eligible =
        desktop.matches &&
        target.clientWidth >= 660 &&
        available >= 100 &&
        target.scrollHeight > target.clientHeight + 8;
      show(eligible);
      if (!eligible) return;
      top = target.offsetTop + 24;
      height = Math.min(items.length * 12, available);
      const bounds = target.getBoundingClientRect();
      inView = nodes
        .filter((node) => {
          const box = node.getBoundingClientRect();
          return box.height > 0 && box.bottom > bounds.top && box.top < bounds.bottom;
        })
        .map((node) => node.dataset.cell!);
    }
    function schedule() {
      if (!frame) frame = requestAnimationFrame(measure);
    }
    const observer = new ResizeObserver(schedule);
    observer.observe(target);
    nodes.forEach((node) => observer.observe(node));
    target.addEventListener('scroll', schedule, { passive: true });
    desktop.addEventListener('change', schedule);
    schedule();
    return () => {
      observer.disconnect();
      target.removeEventListener('scroll', schedule);
      desktop.removeEventListener('change', schedule);
      cancelAnimationFrame(frame);
    };
  });
  function kind(cell: Cell) {
    return cell.kind === 'answer'
      ? 'Note'
      : cell.kind === 'note'
        ? 'Comment'
        : cell.kind === 'approach'
          ? 'Own approach'
          : cell.kind === 'pattern'
            ? 'Pattern'
            : 'Rating';
  }
  function excerpt(cell: Cell) {
    if (cell.pattern)
      return [cell.pattern.title, cell.pattern.summary].filter(Boolean).join('\n\n');
    if (cell.rating)
      return `${cell.rating.label}\n\n${cell.rating.value === null ? 'Unanswered' : `${cell.rating.value} / ${cell.rating.max}`}`;
    return noteBody(cell);
  }
  function markWidth(cell: Cell, index: number) {
    const resting = Math.min(20, 7 + Math.sqrt(excerpt(cell).length) * 0.55);
    const proximity = previewIndex < 0 ? 0 : Math.max(0, 1 - Math.abs(index - previewIndex) / 4);
    return resting + (24 - resting) * proximity;
  }
  async function keydown(event: KeyboardEvent, index: number) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const next =
      event.key === 'ArrowDown'
        ? Math.min(cells.length - 1, index + 1)
        : event.key === 'ArrowUp'
          ? Math.max(0, index - 1)
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? cells.length - 1
              : null;
    if (next === null) return;
    event.preventDefault();
    focusIndex = next;
    await tick();
    rail.querySelector<HTMLButtonElement>(`[data-index="${next}"]`)?.focus();
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape') hovered = null;
  }}
/>

{#if visible}
  <nav
    class="minimap"
    aria-label="Notebook mini-map"
    bind:this={rail}
    style:top={`${top}px`}
    style:height={`${height}px`}
    onpointerleave={() => (hovered = null)}
  >
    {#each cells as cell, index (cell.id)}
      <button
        class:current={activeId === cell.id}
        class:in-view={inView.includes(cell.id)}
        class:previewing={hovered === cell.id}
        aria-label={`Go to cell ${String(index + 1).padStart(2, '0')}: ${kind(cell)}. ${excerpt(cell).slice(0, 100) || 'Empty cell'}`}
        aria-current={activeId === cell.id ? 'location' : undefined}
        aria-describedby={hovered === cell.id ? 'bearings-minimap-preview' : undefined}
        tabindex={index === Math.min(focusIndex, cells.length - 1) ? 0 : -1}
        data-index={index}
        style:height={`${step}px`}
        style:--mark-width={`${markWidth(cell, index)}px`}
        onpointerenter={() => (hovered = cell.id)}
        onfocus={() => {
          focusIndex = index;
          hovered = cell.id;
        }}
        onblur={() => (hovered = null)}
        onkeydown={(event) => keydown(event, index)}
        onclick={() => onselect(cell.id)}><span aria-hidden="true"></span></button
      >
    {/each}
    {#if preview}<div
        class="preview"
        id="bearings-minimap-preview"
        role="tooltip"
        aria-label={excerpt(preview) || 'Empty cell'}
        style:top={`${previewTop}px`}
      >
        <div class="preview-meta">
          <span>{String(previewIndex + 1).padStart(2, '0')}</span><span>{kind(preview)}</span>
        </div>
        <div class="preview-copy">
          {#if textKinds.has(preview.kind) && excerpt(preview)}<BearingsMarkdown
              text={excerpt(preview).slice(0, 600)}
            />{:else}<p>{excerpt(preview).slice(0, 400) || 'Empty cell'}</p>{/if}
        </div>
      </div>{/if}
  </nav>
{/if}

<style>
  .minimap {
    position: absolute;
    display: flex;
    flex-direction: column;
    flex-wrap: nowrap;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0;
    margin: 0;
    padding: 0;
    font-weight: 400;
    text-transform: none;
    letter-spacing: normal;
    left: 5px;
    z-index: 5;
    width: 30px;
  }
  button {
    position: relative;
    display: flex;
    align-items: center;
    width: 30px;
    padding: 0 5px;
    flex: none;
    border: 0;
    background: transparent;
    cursor: pointer;
  }
  button span {
    width: var(--mark-width);
    height: 2px;
    flex: none;
    background: color-mix(in srgb, var(--bearings-ink) 20%, var(--bearings-paper));
    transition:
      background 120ms,
      width 120ms;
  }
  button.in-view span {
    background: color-mix(in srgb, var(--bearings-ink) 45%, var(--bearings-paper));
  }
  button.current span {
    width: 24px;
    background: var(--bearings-accent);
  }
  button.previewing span,
  button:hover span {
    width: 24px;
    background: var(--bearings-ink);
  }
  .preview {
    position: absolute;
    left: 39px;
    width: 300px;
    padding: 16px 18px;
    border: 1px solid var(--bearings-line);
    border-radius: 12px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    box-shadow: 0 8px 24px #17221712;
    pointer-events: none;
  }
  .preview-meta {
    display: flex;
    gap: 10px;
    margin-bottom: 8px;
    color: var(--bearings-muted);
    font-size: 11px;
  }
  .preview-meta > :first-child {
    font-family: ui-monospace, monospace;
    font-variant-numeric: tabular-nums;
  }
  .preview-copy {
    max-height: 130px;
    overflow: hidden;
    overflow-wrap: anywhere;
    font-size: 13px;
    line-height: 1.65;
  }
  .preview-copy p {
    margin: 0;
    white-space: pre-wrap;
  }
  @media (prefers-reduced-motion: reduce) {
    button span {
      transition: none;
    }
  }
</style>

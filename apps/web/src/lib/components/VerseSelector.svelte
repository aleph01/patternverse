<script lang="ts">
  import { onDestroy, onMount, tick, untrack } from 'svelte';
  import { SvelteMap } from 'svelte/reactivity';
  import { ArrowLeft, ArrowRight, Check } from '@lucide/svelte';
  import type { LibraryVerse } from '$lib/client/workspace-library-view';
  import { groupVersesByArea, verseArea } from '$lib/verse-areas';
  import { verseAccentClass } from '$lib/verse-accent';
  import VerseAreaFilters from './VerseAreaFilters.svelte';
  import VerseAreaDivider from './VerseAreaDivider.svelte';

  type Verse = LibraryVerse & { key: string };
  let {
    verses,
    selected,
    onselect,
    oncollapse,
    startOpen = false,
    compact = false,
  }: {
    verses: readonly Verse[];
    selected: string;
    onselect: (key: string) => void;
    oncollapse?: () => void;
    startOpen?: boolean;
    compact?: boolean;
  } = $props();

  const uid = $props.id();
  let root: HTMLDivElement;
  let toggle: HTMLButtonElement;
  let ready = $state(false);
  let phase = $state<'open' | 'closing' | 'closed'>('open');
  let selectedArea = $state('all');
  let pendingSelection = $state<string>();
  let lastSelection: string | undefined;
  let closeTimer: ReturnType<typeof setTimeout> | undefined;
  const scrollPositions = new SvelteMap<string, number>();
  let edges = $state<Record<string, { start: boolean; end: boolean }>>({});
  const activeKey = $derived(pendingSelection ?? selected);
  const current = $derived(verses.find((verse) => verse.key === activeKey));
  const currentArea = $derived(current ? verseArea(current) : undefined);
  const groups = $derived(groupVersesByArea(verses));
  const visibleGroups = $derived(
    groups.filter((group) => selectedArea === 'all' || group.area.id === selectedArea),
  );
  const verseTitle = (verse: Verse) =>
    verse.title + (verse.sourceId === 'personal' ? ' · Mine' : '');
  const reducedMotion = () =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  function cancelClose() {
    clearTimeout(closeTimer);
    closeTimer = undefined;
  }
  function collapse(animate: boolean, notify = true) {
    cancelClose();
    rememberScroll();
    if (root?.contains(document.activeElement)) toggle?.focus({ preventScroll: true });
    const reduced = reducedMotion();
    const finish = () => {
      phase = 'closed';
      closeTimer = undefined;
      if (notify && oncollapse) {
        if (reduced) oncollapse();
        else closeTimer = setTimeout(() => oncollapse?.(), 280);
      }
    };
    if (animate && !reduced) {
      phase = 'closing';
      closeTimer = setTimeout(finish, 120);
    } else finish();
  }
  function choose(key: string) {
    pendingSelection = key;
    onselect(key);
    collapse(true);
  }
  function updateEdges() {
    if (!root) return;
    for (const track of root.querySelectorAll<HTMLElement>('.verse-track')) {
      const id = track.dataset.area!;
      const start = track.scrollLeft <= 2;
      const end = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
      if (edges[id]?.start !== start || edges[id]?.end !== end) edges[id] = { start, end };
    }
  }
  function rememberScroll() {
    if (!root) return;
    for (const track of root.querySelectorAll<HTMLElement>('.verse-track')) {
      scrollPositions.set(track.dataset.area!, track.scrollLeft);
    }
  }
  async function restoreScroll(focusSelection = false) {
    await tick();
    if (!root) return;
    for (const track of root.querySelectorAll<HTMLElement>('.verse-track')) {
      track.scrollLeft = scrollPositions.get(track.dataset.area!) ?? 0;
    }
    if (focusSelection) {
      const choice = root.querySelector<HTMLButtonElement>('.verse-square[aria-pressed="true"]');
      if (choice) {
        choice.focus({ preventScroll: true });
        const track = choice.closest<HTMLElement>('.verse-track')!;
        const tileBox = choice.getBoundingClientRect();
        const trackBox = track.getBoundingClientRect();
        if (tileBox.left < trackBox.left) track.scrollLeft += tileBox.left - trackBox.left;
        else if (tileBox.right > trackBox.right) track.scrollLeft += tileBox.right - trackBox.right;
      } else root.querySelector<HTMLButtonElement>('.verse-square')?.focus({ preventScroll: true });
    }
    updateEdges();
  }
  export async function open() {
    cancelClose();
    phase = 'open';
    await restoreScroll(true);
  }
  function changeArea() {
    rememberScroll();
    void restoreScroll();
  }
  function scrollArea(event: MouseEvent, direction: number) {
    const track = (event.currentTarget as HTMLElement)
      .closest('.selector-area')!
      .querySelector<HTMLElement>('.verse-track')!;
    track.scrollBy({
      left: direction * track.clientWidth * 0.8,
      behavior: reducedMotion() ? 'instant' : 'smooth',
    });
  }

  $effect(() => {
    const key = selected;
    const selectedVerse = verses.find((verse) => verse.key === key);
    untrack(() => {
      const changed = lastSelection !== key;
      if (lastSelection === undefined) {
        if (key !== 'all' && !startOpen) phase = 'closed';
      } else if (lastSelection !== key) {
        pendingSelection = undefined;
        if (phase === 'open') collapse(false, false);
      }
      lastSelection = key;
      if (
        changed &&
        selectedVerse &&
        selectedArea !== 'all' &&
        verseArea(selectedVerse).id !== selectedArea
      ) {
        selectedArea = verseArea(selectedVerse).id;
      }
    });
  });
  $effect(() => {
    if (selectedArea !== 'all' && !groups.some((group) => group.area.id === selectedArea)) {
      selectedArea = 'all';
    }
  });
  onMount(() => {
    ready = true;
    void restoreScroll();
    const observer =
      typeof ResizeObserver === 'undefined' ? undefined : new ResizeObserver(updateEdges);
    observer?.observe(root);
    return () => observer?.disconnect();
  });
  onDestroy(cancelClose);
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape' && phase === 'open' && root?.contains(document.activeElement)) {
      event.preventDefault();
      collapse(false);
    }
  }}
/>

<div class="verse-selector" class:compact data-state={phase} bind:this={root}>
  <div class="selector-header">
    <div class="selector-current" aria-live="polite">
      <span
        class="selector-swatch {current ? verseAccentClass(current.id) : 'all-verses'}"
        aria-hidden="true"
      ></span>
      <div>
        <small>{currentArea?.title ?? 'Verse'}</small>
        <h3>{current ? verseTitle(current) : 'All verses'}</h3>
      </div>
    </div>
    <div class="selector-actions">
      <button
        type="button"
        class="change-verse"
        bind:this={toggle}
        disabled={!ready}
        aria-expanded={phase === 'open'}
        aria-controls={`${uid}-choices`}
        onclick={() => (phase === 'open' ? collapse(false) : void open())}
        >{phase === 'open' ? 'Done' : 'Change verse'}</button
      >
    </div>
  </div>
  <div class="verse-chooser-wrap" class:collapsed={phase === 'closed'}>
    <div
      class="verse-chooser"
      id={`${uid}-choices`}
      inert={phase !== 'open'}
      aria-hidden={phase !== 'open'}
    >
      <VerseAreaFilters
        areas={groups.map((group) => group.area)}
        bind:value={selectedArea}
        onchange={changeArea}
      />
      <div role="group" aria-label="Choose one Verse">
        {#each visibleGroups as group (group.area.id)}
          <section
            class="selector-area mobile-verse-area"
            aria-labelledby={`${uid}-${group.area.id}`}
          >
            <div class="area-heading">
              <VerseAreaDivider id={`${uid}-${group.area.id}`} title={group.area.title} level={4} />
              <div class="verse-scroll-actions">
                <button
                  type="button"
                  disabled={!ready || (edges[group.area.id]?.start ?? true)}
                  aria-label={`Previous Verses in ${group.area.title}`}
                  onclick={(event) => scrollArea(event, -1)}
                  ><ArrowLeft size={16} aria-hidden="true" /></button
                >
                <button
                  type="button"
                  disabled={!ready || (edges[group.area.id]?.end ?? false)}
                  aria-label={`More Verses in ${group.area.title}`}
                  onclick={(event) => scrollArea(event, 1)}
                  ><ArrowRight size={16} aria-hidden="true" /></button
                >
              </div>
            </div>
            <div
              class="verse-track"
              data-area={group.area.id}
              onscroll={() => {
                rememberScroll();
                updateEdges();
              }}
            >
              {#each group.verses as verse (verse.key)}
                <button
                  type="button"
                  class="verse-square {verseAccentClass(verse.id)}"
                  data-verse={verse.key}
                  disabled={!ready}
                  aria-pressed={activeKey === verse.key}
                  onclick={() => choose(verse.key)}
                  ><Check size={17} aria-hidden="true" /><span>{verseTitle(verse)}</span></button
                >
              {/each}
            </div>
          </section>
        {/each}
      </div>
    </div>
  </div>
</div>

<style>
  .verse-selector {
    container: verse-selector / inline-size;
    min-width: 0;
  }
  .selector-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
    min-height: 76px;
    padding-bottom: 0.5rem;
  }
  .selector-current {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    flex: 1 1 200px;
    min-width: 0;
  }
  .selector-current > div {
    min-width: 0;
  }
  .selector-swatch {
    flex: 0 0 28px;
    width: 28px;
    height: 28px;
    background: var(--verse-rest, #f3f4ef);
  }
  small {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--muted);
    font-size: 0.72rem;
    text-transform: lowercase;
  }
  h3 {
    margin: 0;
    color: var(--ink);
    font-size: clamp(1.1rem, 3cqi, 1.65rem);
    line-height: 1.15;
    font-weight: 750;
    letter-spacing: -0.04em;
    text-transform: lowercase;
  }
  .selector-actions {
    display: flex;
    gap: 1.25rem;
    flex: 0 0 auto;
  }
  .selector-actions button {
    min-height: 44px;
    padding: 0.4rem 0;
    border: 0;
    border-bottom: 1px solid var(--ink);
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .selector-actions button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .verse-chooser-wrap {
    display: grid;
    grid-template-rows: 1fr;
    opacity: 1;
    transition:
      grid-template-rows 280ms cubic-bezier(0.2, 0.7, 0.2, 1),
      opacity 280ms ease;
  }
  .verse-chooser-wrap.collapsed {
    grid-template-rows: 0fr;
    opacity: 0;
  }
  .verse-chooser {
    min-height: 0;
    overflow: hidden;
  }
  .area-heading {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.75rem;
    align-items: center;
  }
  .verse-scroll-actions {
    display: flex;
  }
  .verse-scroll-actions button {
    display: grid;
    place-items: center;
    width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .verse-scroll-actions button:disabled {
    opacity: 0.25;
    cursor: default;
  }
  .verse-track {
    display: flex;
    gap: 3px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x proximity;
    padding-bottom: 8px;
    scrollbar-width: thin;
    scrollbar-color: color-mix(in srgb, var(--ink) 30%, transparent) transparent;
  }
  .verse-square {
    position: relative;
    display: flex;
    align-items: flex-end;
    flex: 0 0 clamp(156px, 19cqi, 210px);
    min-width: 0;
    aspect-ratio: 1;
    padding: 16px;
    border: 0;
    border-radius: 0;
    color: var(--ink);
    background: color-mix(in srgb, var(--verse-rest) 35%, var(--paper));
    font: inherit;
    font-size: 1.05rem;
    font-weight: 650;
    line-height: 1.15;
    letter-spacing: -0.025em;
    text-align: left;
    overflow-wrap: anywhere;
    scroll-snap-align: start;
    cursor: pointer;
    transition:
      opacity 120ms ease,
      transform 120ms ease,
      background-color 180ms ease;
  }
  .verse-square[aria-pressed='true'],
  .verse-square:hover {
    background: var(--verse-rest);
  }
  .verse-square :global(svg) {
    position: absolute;
    top: 12px;
    right: 12px;
  }
  .verse-square:not([aria-pressed='true']) :global(svg) {
    visibility: hidden;
  }
  [data-state='closing'] .verse-square:not([aria-pressed='true']) {
    opacity: 0;
    transform: translateY(6px);
  }
  .compact {
    --verse-area-divider-height: 48px;
  }
  button:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: -3px;
  }
  @media (prefers-reduced-motion: reduce) {
    .verse-chooser-wrap,
    .verse-square {
      transition: none;
    }
  }
</style>

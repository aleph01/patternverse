<script lang="ts">
  import { onMount } from 'svelte';
  import { ChevronLeft, ChevronRight, Layers, Library } from '@lucide/svelte';
  import type { EntitySummary } from '$lib/server/commons';
  import type { LibraryCollections } from '$lib/library-collections';
  import { collectionKey } from '$lib/collection-navigation';

  let {
    items,
    collections,
    selected = 'all',
    allSummary = 'Explore the Commons',
    onselect,
  }: {
    items: readonly EntitySummary[];
    collections: LibraryCollections;
    selected?: string;
    allSummary?: string;
    onselect: (key: string) => void;
  } = $props();

  const uid = $props.id();
  const tiles = $derived([
    ...items.map((item) => ({
      key: collectionKey(item),
      title: item.sourceId === 'personal' ? `${item.title} · Mine` : item.title,
      count:
        collections.get(collectionKey(item))?.filter((entry) => entry.type === 'pattern').length ??
        0,
    })),
    { key: 'all', title: 'All patterns', count: null },
  ]);
  const pages = $derived(
    Array.from({ length: Math.ceil(tiles.length / 4) }, (_, index) =>
      tiles.slice(index * 4, index * 4 + 4),
    ),
  );
  const pageIdentity = $derived(tiles.map((tile) => tile.key).join('|'));
  let track: HTMLDivElement;
  let currentPage = $state(0);

  function pageOffset(index: number) {
    const first = track.firstElementChild as HTMLElement | null;
    const page = track.children[index] as HTMLElement | undefined;
    return first && page ? page.offsetLeft - first.offsetLeft : 0;
  }

  function updatePosition() {
    if (!track) return;
    let nearest = 0;
    for (let index = 1; index < pages.length; index++) {
      if (
        Math.abs(track.scrollLeft - pageOffset(index)) <
        Math.abs(track.scrollLeft - pageOffset(nearest))
      )
        nearest = index;
    }
    currentPage = nearest;
  }

  function goToPage(index: number) {
    track.scrollTo({
      left: pageOffset(Math.max(0, Math.min(pages.length - 1, index))),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }

  function navigate(event: KeyboardEvent) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = Math.max(
      0,
      Math.min(pages.length - 1, currentPage + (event.key === 'ArrowRight' ? 1 : -1)),
    );
    goToPage(next);
    (track.children[next] as HTMLElement)?.querySelector('button')?.focus({ preventScroll: true });
  }

  onMount(() => {
    const resize = new ResizeObserver(updatePosition);
    resize.observe(track);
    return () => resize.disconnect();
  });

  $effect(() => {
    // Scope and verse changes can remove pages; reset only when their contents change.
    if (pageIdentity && track) {
      track.scrollTo({ left: 0, behavior: 'instant' });
      currentPage = 0;
    }
  });
</script>

<section class="mobile-collections" aria-labelledby={`${uid}-heading`}>
  <h3 id={`${uid}-heading`}>Collections</h3>
  <div class="collection-track" bind:this={track} onscroll={updatePosition}>
    {#each pages as page, index (index)}
      <div
        class="collection-page"
        role="group"
        aria-label={`Collection group ${index + 1} of ${pages.length}`}
      >
        {#each page as tile (tile.key)}
          <button
            type="button"
            class="collection-tile"
            class:chosen={selected === tile.key && selected !== 'all'}
            aria-pressed={selected === tile.key}
            onclick={() => onselect(tile.key)}
            onkeydown={navigate}
          >
            {#if tile.key === 'all'}<Library size={20} aria-hidden="true" />{:else}<Layers
                size={20}
                aria-hidden="true"
              />{/if}
            <span class="collection-title">{tile.title}</span>
            <span class="collection-count"
              >{tile.count === null
                ? allSummary
                : `${tile.count} ${tile.count === 1 ? 'pattern' : 'patterns'}`}</span
            >
          </button>
        {/each}
      </div>
    {/each}
  </div>
  {#if pages.length > 1}
    <div class="collection-pager">
      <button
        type="button"
        disabled={currentPage === 0}
        aria-label="Previous collections"
        onclick={() => goToPage(currentPage - 1)}
        ><ChevronLeft size={18} aria-hidden="true" /></button
      >
      <span aria-live="polite" aria-atomic="true">{currentPage + 1} / {pages.length}</span>
      <button
        type="button"
        disabled={currentPage === pages.length - 1}
        aria-label="More collections"
        onclick={() => goToPage(currentPage + 1)}
        ><ChevronRight size={18} aria-hidden="true" /></button
      >
    </div>
  {/if}
</section>

<style>
  .mobile-collections {
    margin: 1.5rem 0 1rem;
    min-width: 0;
  }
  h3 {
    margin: 0 0 0.8rem;
    font-size: 1rem;
    font-weight: 750;
    letter-spacing: -0.025em;
    text-transform: lowercase;
  }
  .collection-track {
    position: relative;
    display: flex;
    gap: 12px;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scroll-snap-type: x mandatory;
    scroll-padding-inline: 4px;
    scrollbar-width: none;
    margin: 0 -4px;
    padding: 4px;
  }
  .collection-track::-webkit-scrollbar {
    display: none;
  }
  .collection-page {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    grid-template-rows: repeat(2, minmax(142px, 1fr));
    gap: 10px;
    flex: 0 0 100%;
    min-width: 0;
    scroll-snap-align: start;
    scroll-snap-stop: always;
  }
  .collection-tile {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.65rem;
    min-height: 142px;
    min-width: 0;
    padding: 1rem 0.85rem;
    border: 1px solid #deded8;
    border-radius: 5px;
    text-align: left;
    font: inherit;
    color: var(--ink);
    background: var(--paper);
    cursor: pointer;
  }
  .collection-tile :global(svg) {
    flex-shrink: 0;
    color: var(--green-dark);
  }
  .collection-title {
    font-size: 1rem;
    font-weight: 750;
    line-height: 1.3;
    letter-spacing: -0.025em;
    overflow-wrap: anywhere;
  }
  .collection-count {
    margin-top: auto;
    color: var(--muted);
    font-size: 0.72rem;
    line-height: 1.4;
  }
  .collection-tile.chosen {
    color: var(--ink);
    background: var(--mint);
    border-color: var(--green-dark);
  }
  .collection-tile:hover,
  .collection-tile:focus-visible {
    border-color: var(--green-dark);
    background: var(--entry-hover-background);
  }
  .collection-tile.chosen:hover,
  .collection-tile.chosen:focus-visible {
    background: var(--mint);
  }
  button:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: 1px;
  }
  .collection-pager {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    margin: 0.3rem 0 0;
  }
  .collection-pager button {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #deded8;
    border-radius: 5px;
    color: var(--ink);
    background: var(--paper);
    cursor: pointer;
  }
  .collection-pager button:disabled {
    opacity: 0.3;
    cursor: default;
  }
  .collection-pager button:hover:not(:disabled) {
    background: var(--mint);
    border-color: var(--green-dark);
  }
  .collection-pager span {
    min-width: 3rem;
    font-size: 0.75rem;
    color: var(--muted);
    text-align: center;
  }
</style>

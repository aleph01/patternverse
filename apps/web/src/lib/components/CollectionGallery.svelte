<script lang="ts">
  import { onDestroy, tick } from 'svelte';
  import { ChevronLeft, ChevronRight, X } from '@lucide/svelte';
  import type { EntitySummary } from '$lib/server/commons';
  import { collectionItemHref } from '$lib/collection-navigation';
  import { paginationFor } from '$lib/pagination';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import { patternIconForPattern } from '$lib/illustrations/pattern-mark-presets';

  let {
    id,
    collection,
    items,
    open = $bindable(false),
    requestedPage = $bindable(1),
    onclose,
  }: {
    id: string;
    collection: EntitySummary;
    items: readonly EntitySummary[];
    open?: boolean;
    requestedPage?: number;
    onclose?: () => void;
  } = $props();

  let dialog = $state<HTMLDialogElement>();
  let body = $state<HTMLDivElement>();
  let previousButton = $state<HTMLButtonElement>();
  let nextButton = $state<HTMLButtonElement>();
  let pressedBackdrop = false;
  const pagination = $derived(paginationFor(items.length, requestedPage, 4));
  const visibleItems = $derived(items.slice(pagination.start, pagination.end));
  const noun = $derived(
    items.every((item) => item.type === 'pattern')
      ? items.length === 1
        ? 'pattern'
        : 'patterns'
      : items.length === 1
        ? 'item'
        : 'items',
  );

  $effect(() => {
    if (requestedPage !== pagination.page) requestedPage = pagination.page;
  });
  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
  $effect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  });
  onDestroy(() => {
    dialog?.close();
  });

  function outside(event: PointerEvent) {
    if (!dialog || event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }

  function trapFocus(event: KeyboardEvent) {
    if (event.key !== 'Tab' || !dialog) return;
    const controls = Array.from(
      dialog.querySelectorAll<HTMLAnchorElement | HTMLButtonElement>(
        'a[href], button:not(:disabled)',
      ),
    ).filter((element) => element.getClientRects().length > 0);
    const first = controls[0];
    const last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  async function goToPage(page: number, trigger: HTMLButtonElement) {
    requestedPage = page;
    await tick();
    if (body) body.scrollTop = 0;
    if (trigger.disabled) (trigger === previousButton ? nextButton : previousButton)?.focus();
  }
</script>

<dialog
  bind:this={dialog}
  {id}
  class="collection-gallery"
  aria-labelledby={`${id}-title`}
  aria-describedby={collection.summary ? `${id}-description` : undefined}
  onkeydown={trapFocus}
  onclose={() => {
    open = false;
    onclose?.();
  }}
  onpointerdown={(event) => {
    pressedBackdrop = outside(event);
  }}
  onpointerup={(event) => {
    if (pressedBackdrop && outside(event)) dialog?.close();
    pressedBackdrop = false;
  }}
>
  {#if open}
    <div class="gallery-shell">
      <header class="gallery-heading">
        <button
          class="gallery-close"
          type="button"
          aria-label="Close collection"
          onclick={() => dialog?.close()}><X size={18} aria-hidden="true" /></button
        >
        {#if collection.verseNames?.length}
          <div class="gallery-verses">
            {#each [...new Set(collection.verseNames)] as verse (verse)}<span>{verse}</span>{/each}
          </div>
        {/if}
        <div class="gallery-title-line">
          <h2 id={`${id}-title`}>{collection.title}</h2>
          <span class="gallery-total">{items.length} {noun}</span>
        </div>
        {#if collection.summary}<p id={`${id}-description`}>{collection.summary}</p>{/if}
      </header>
      <div class="gallery-body" bind:this={body}>
        {#if items.length}
          <ol
            class="gallery-grid"
            class:paginated={pagination.pageCount > 1}
            start={pagination.start + 1}
          >
            {#each visibleItems as item (`${item.sourceId}:${item.id}`)}
              <li>
                <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- Compiled and personal summary URLs retain their source-qualified collection context. -->
                <a class="gallery-card" href={collectionItemHref(item.url, collection)}>
                  <h3>{item.title}</h3>
                  {#if item.summary}<p>{item.summary}</p>{/if}
                  <span class="gallery-card-bottom" aria-hidden="true"
                    ><span class="gallery-arrow">↗</span>
                    {#if item.type === 'pattern'}<span class="gallery-mark"
                        ><PatternIcon
                          icon={patternIconForPattern(item.id, item.title)}
                          decorative
                        /></span
                      >{:else if item.type === 'collection'}<span class="gallery-nested"
                        >Collection</span
                      >{/if}
                  </span>
                </a>
              </li>
            {/each}
          </ol>
        {:else}
          <p class="gallery-empty" role="status">This collection has no available items yet.</p>
        {/if}
      </div>
      {#if pagination.pageCount > 1}
        <div class="gallery-pagination">
          <span class="gallery-range" role="status"
            >{pagination.start + 1}–{pagination.end} of {items.length}</span
          >
          <nav aria-label="Collection pages">
            <button
              bind:this={previousButton}
              type="button"
              aria-label="Previous page"
              disabled={pagination.page === 1}
              onclick={(event) => void goToPage(pagination.page - 1, event.currentTarget)}
              ><ChevronLeft size={18} aria-hidden="true" /></button
            >
            <span>Page {pagination.page} of {pagination.pageCount}</span>
            <button
              bind:this={nextButton}
              type="button"
              aria-label="Next page"
              disabled={pagination.page === pagination.pageCount}
              onclick={(event) => void goToPage(pagination.page + 1, event.currentTarget)}
              ><ChevronRight size={18} aria-hidden="true" /></button
            >
          </nav>
        </div>
      {/if}
    </div>
  {/if}
</dialog>

<style>
  .collection-gallery {
    width: min(650px, calc(100vw - 4rem));
    max-width: none;
    max-height: calc(100dvh - 4rem);
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid #d0d4cc;
    border-radius: 8px;
    color: var(--ink);
    background: var(--paper);
    box-shadow: 0 14px 45px rgb(24 24 20 / 16%);
  }
  .collection-gallery::backdrop {
    background: rgb(24 24 20 / 27%);
  }
  .gallery-shell {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 4rem - 2px);
  }
  .gallery-heading {
    position: relative;
    flex: none;
    padding: 28px 70px 22px 28px;
  }
  .gallery-close {
    position: absolute;
    top: 18px;
    right: 18px;
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    color: var(--muted);
    background: var(--paper);
    cursor: pointer;
  }
  .gallery-close:hover {
    color: var(--ink);
    background: var(--entry-hover-background);
  }
  .gallery-verses {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-bottom: 16px;
  }
  .gallery-verses span {
    padding: 5px 8px;
    border-radius: 3px;
    color: var(--green-dark);
    background: var(--mint);
    font-size: 0.7rem;
    font-weight: 650;
    line-height: 1.4;
  }
  .gallery-title-line {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 12px;
  }
  .gallery-title-line h2 {
    margin: 0;
    font-size: 2rem;
    font-weight: 850;
    line-height: 1.1;
    letter-spacing: -0.05em;
    overflow-wrap: anywhere;
  }
  .gallery-total {
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .gallery-heading > p {
    margin: 12px 0 0;
    color: var(--muted);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .gallery-body {
    min-height: 0;
    padding: 0 28px 4px;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .gallery-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    margin: 0;
    padding: 0 0 20px;
    list-style: none;
  }
  .gallery-grid.paginated {
    min-height: 388px;
    grid-template-rows: repeat(2, minmax(178px, auto));
  }
  .gallery-grid li {
    display: flex;
    min-width: 0;
  }
  .gallery-card {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    min-height: 178px;
    padding: 16px;
    border: 1px solid #d0d4cc;
    border-radius: 4px;
    color: var(--ink);
    background: var(--paper);
    text-decoration: none;
  }
  .gallery-card h3 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 750;
    line-height: 1.25;
    letter-spacing: -0.025em;
    overflow-wrap: anywhere;
  }
  .gallery-card p {
    margin: 6px 0 14px;
    color: var(--muted);
    font-size: 0.8125rem;
    line-height: 1.5;
  }
  .gallery-card:hover {
    background: var(--entry-hover-background);
    border-color: var(--green-dark);
  }
  .gallery-card:hover h3 {
    color: var(--green-dark);
  }
  .gallery-card-bottom {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    margin-top: auto;
    padding-top: 4px;
  }
  .gallery-arrow {
    color: var(--green-dark);
    font-size: 1.125rem;
  }
  .gallery-mark {
    display: block;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
  }
  .gallery-nested {
    color: var(--green-dark);
    font-size: 0.75rem;
  }
  .gallery-pagination {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin: 0 28px 28px;
    padding-top: 16px;
    border-top: 1px solid #d0d4cc;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .gallery-pagination nav {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 0;
  }
  .gallery-pagination nav > span {
    color: var(--ink);
    white-space: nowrap;
    font-variant-numeric: tabular-nums;
  }
  .gallery-pagination button {
    display: grid;
    place-items: center;
    width: 40px;
    height: 40px;
    padding: 0;
    border: 1px solid #d0d4cc;
    border-radius: 4px;
    color: var(--ink);
    background: var(--paper);
    cursor: pointer;
  }
  .gallery-pagination button:hover:not(:disabled) {
    color: var(--green-dark);
    border-color: var(--green-dark);
    background: var(--entry-hover-background);
  }
  .gallery-pagination button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .gallery-empty {
    margin: 0;
    padding: 20px 0 28px;
    color: var(--muted);
    font-size: 0.875rem;
    line-height: 1.5;
  }
  .gallery-card:focus-visible {
    outline-offset: -3px;
  }
</style>

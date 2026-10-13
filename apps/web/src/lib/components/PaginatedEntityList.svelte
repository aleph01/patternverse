<script lang="ts">
  import { tick, onMount } from 'svelte';
  import type { EntitySummary } from '$lib/server/commons';
  import { paginationFor } from '$lib/pagination';
  import EntityList from './EntityList.svelte';
  import { readLibraryPreferences } from '$lib/client/library-preferences';
  import type { LibraryCollections } from '$lib/library-collections';

  let {
    items,
    compact = false,
    layout = 'list',
    cardsOnMobile = false,
    label = 'Entries',
    collectionContext,
    collections,
  }: {
    items: readonly EntitySummary[];
    compact?: boolean;
    layout?: 'list' | 'cards';
    cardsOnMobile?: boolean;
    label?: string;
    collectionContext?: Pick<EntitySummary, 'sourceId' | 'id'>;
    collections?: LibraryCollections;
  } = $props();

  let requestedPage = $state(1);
  let pageSize = $state(20);
  onMount(() => {
    pageSize = readLibraryPreferences().pageSize;
  });
  let region: HTMLDivElement;
  const pagination = $derived(paginationFor(items.length, requestedPage, pageSize));
  const visibleItems = $derived(items.slice(pagination.start, pagination.end));

  $effect(() => {
    // If local content changes, keep the selected page inside the new bounds.
    if (requestedPage !== pagination.page) requestedPage = pagination.page;
  });

  async function goToPage(page: number) {
    requestedPage = page;
    await tick();
    region.focus({ preventScroll: true });
    region.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
</script>

<div class="paginated-entries" bind:this={region} tabindex="-1" role="region" aria-label={label}>
  <EntityList
    items={visibleItems}
    {compact}
    {layout}
    {cardsOnMobile}
    startAt={pagination.start + 1}
    {collectionContext}
    {collections}
  />

  {#if pagination.pageCount > 1}
    <div class="pagination-footer">
      <p role="status">
        {pagination.start + 1}–{pagination.end} of {items.length} entries
        <span> · page {pagination.page} of {pagination.pageCount}</span>
      </p>
      <nav class="pagination" aria-label={`${label} pagination`}>
        <button
          type="button"
          disabled={pagination.page === 1}
          onclick={() => goToPage(pagination.page - 1)}
          aria-label="Previous page"><span aria-hidden="true">←</span> Previous</button
        >
        <div class="page-numbers">
          {#each pagination.pages as number, index (`${number}:${index}`)}
            {#if number === 'ellipsis'}
              <span class="ellipsis" aria-hidden="true">…</span>
            {:else}
              <button
                type="button"
                class="page-number"
                aria-label={`Go to page ${number}`}
                aria-current={pagination.page === number ? 'page' : undefined}
                onclick={() => goToPage(number)}>{number}</button
              >
            {/if}
          {/each}
        </div>
        <button
          type="button"
          disabled={pagination.page === pagination.pageCount}
          onclick={() => goToPage(pagination.page + 1)}
          aria-label="Next page">Next <span aria-hidden="true">→</span></button
        >
      </nav>
    </div>
  {/if}
</div>

<style>
  .paginated-entries {
    scroll-margin-top: 1.5rem;
    min-width: 0;
  }
  .paginated-entries:focus {
    outline: none;
  }
  .pagination-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1.5rem;
  }
  .pagination-footer p {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.5;
    color: #5c5b54;
  }
  .pagination-footer p span {
    white-space: nowrap;
  }
  .pagination,
  .page-numbers {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    font: inherit;
  }
  .pagination button {
    min-height: 44px;
    min-width: 44px;
    padding: 0.65rem 0.8rem;
    border: 1px solid #deded8;
    border-radius: 5px;
    background: var(--paper, white);
    color: var(--ink, #181814);
    font-size: 0.8rem;
    font-weight: 650;
    cursor: pointer;
  }
  .pagination button:hover:not(:disabled):not([aria-current='page']) {
    background: var(--mint, #dff8ea);
    border-color: var(--green-dark, #007a4d);
  }
  .pagination button[aria-current='page'] {
    background: var(--ink, #181814);
    color: white;
    border-color: var(--ink, #181814);
  }
  .pagination button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .ellipsis {
    padding-inline: 0.3rem;
    color: #5c5b54;
  }
  @media (max-width: 800px) {
    .pagination-footer {
      flex-direction: column;
      align-items: flex-start;
    }
    .pagination {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      width: 100%;
      gap: 0.5rem;
    }
    .page-numbers {
      grid-column: 1 / -1;
      grid-row: 1;
    }
    .pagination > button:first-child {
      justify-self: start;
    }
    .pagination > button:last-child {
      justify-self: end;
    }
    .pagination button {
      padding-inline: 0.6rem;
    }
  }
</style>

<script lang="ts">
  import { BookmarkCheck, ChevronDown, ChevronUp } from '@lucide/svelte';
  import type { EntitySummary } from '$lib/server/commons';
  import { collectionItemHref } from '$lib/collection-navigation';
  import SaveToLibrary from './SaveToLibrary.svelte';

  let { collection, items }: { collection: EntitySummary; items: readonly EntitySummary[] } =
    $props();
  const uid = $props.id();
  let expanded = $state(false);
  let showAll = $state(false);
  const noun = $derived(
    items.every((item) => item.type === 'pattern')
      ? items.length === 1
        ? 'pattern'
        : 'patterns'
      : items.length === 1
        ? 'item'
        : 'items',
  );
  const label = $derived(
    `${expanded ? 'Hide' : 'Show'} ${items.length} ${noun} in ${collection.title}`,
  );
  const visibleItems = $derived(showAll ? items : items.slice(0, 4));
</script>

<div class="collection-expansion">
  <button
    type="button"
    class="collection-count"
    aria-label={label}
    aria-expanded={expanded}
    aria-controls={expanded ? uid : undefined}
    disabled={!items.length}
    onclick={() => (expanded = !expanded)}
  >
    <span>{items.length}</span>
    {#if expanded}<ChevronUp size={16} aria-hidden="true" />{:else}<ChevronDown
        size={16}
        aria-hidden="true"
      />{/if}
  </button>
  {#if expanded}
    <div
      class="collection-contents"
      id={uid}
      role="region"
      aria-label={`${collection.title} contents`}
    >
      <ol class="collection-items">
        {#each visibleItems as item, index (`${item.sourceId}:${item.id}`)}
          <li>
            <span class="item-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <div class="item-copy">
              <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
              <a href={collectionItemHref(item.url, collection)}
                >{item.title} <span class="item-arrow" aria-hidden="true">↗</span></a
              >
              {#if item.summary}<p>{item.summary}</p>{/if}
            </div>
            {#if item.sourceId === 'personal'}
              <span class="owned-item" aria-label="In your workspace"
                ><BookmarkCheck size={18} aria-hidden="true" /></span
              >
            {:else}
              <SaveToLibrary sourceId={item.sourceId} entityId={item.id} compact />
            {/if}
          </li>
        {/each}
      </ol>
      {#if !showAll && items.length > visibleItems.length}
        <button class="show-all" type="button" onclick={() => (showAll = true)}
          >Show all {items.length} {noun} <span aria-hidden="true">↓</span></button
        >
      {/if}
    </div>
  {/if}
</div>

<style>
  .collection-expansion {
    margin: -0.4rem 0.25rem 1rem;
  }
  .collection-count {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    min-width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
  }
  .collection-count:hover:not(:disabled),
  .collection-count[aria-expanded='true'] {
    color: var(--green-dark);
  }
  .collection-count:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .collection-contents {
    margin-top: 0.25rem;
    padding: 0 14px;
    border-top: 1px solid #deded8;
    background: color-mix(in srgb, var(--paper, white) 97%, var(--ink));
    border-radius: 0 0 3px 3px;
  }
  .collection-items {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .collection-items li {
    display: grid;
    grid-template-columns: 20px minmax(0, 1fr) 44px;
    gap: 8px;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #deded8;
  }
  .collection-items li:last-child {
    border-bottom: 0;
  }
  .item-number {
    align-self: start;
    padding-top: 3px;
    color: var(--muted);
    font-size: 0.65rem;
  }
  .item-copy {
    min-width: 0;
  }
  .item-copy a {
    color: var(--ink);
    font-size: 0.82rem;
    line-height: 1.45;
    font-weight: 650;
    text-decoration: none;
    overflow-wrap: anywhere;
  }
  .item-copy a:hover {
    color: var(--green-dark);
  }
  .item-arrow {
    color: var(--green-dark);
    white-space: nowrap;
    font-weight: 400;
  }
  .item-copy p {
    margin: 4px 0 0;
    font-size: 0.75rem;
    line-height: 1.5;
    color: var(--muted);
  }
  .owned-item {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--green-dark);
  }
  .show-all {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 8px 0;
    border: 0;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.75rem;
    font-weight: 650;
    cursor: pointer;
  }
  .show-all:hover {
    color: var(--green-dark);
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  @media (max-width: 800px) {
    .collection-expansion {
      margin-inline: 0;
    }
  }
</style>

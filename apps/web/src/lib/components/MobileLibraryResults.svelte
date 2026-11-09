<script lang="ts">
  import type { EntitySummary } from '$lib/server/commons';
  import { collectionItemHref } from '$lib/collection-navigation';
  import SaveToLibrary from './SaveToLibrary.svelte';
  import { libraryEntryKey } from '@patternverse/workspace/library';

  let {
    items,
    collectionContext,
    label = 'Library results',
    showType = false,
    broaderMatchKeys,
  }: {
    items: readonly EntitySummary[];
    collectionContext?: Pick<EntitySummary, 'sourceId' | 'id'>;
    label?: string;
    showType?: boolean;
    broaderMatchKeys?: ReadonlySet<string>;
  } = $props();
  const itemHref = (item: EntitySummary) =>
    collectionContext ? collectionItemHref(item.url, collectionContext) : item.url;
  const strictItems = $derived(
    items.filter((item) => !broaderMatchKeys?.has(libraryEntryKey(item))),
  );
  const broaderItems = $derived(
    items.filter((item) => broaderMatchKeys?.has(libraryEntryKey(item))),
  );
</script>

{#snippet resultList(entries: readonly EntitySummary[])}
  <ol class="pattern-feed">
    {#each entries as item (`${item.sourceId}:${item.id}`)}
      <li>
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="feed-row" href={itemHref(item)}>
          {#if showType}
            <p class="result-type">
              {item.type}{#if item.collectionNames?.length}
                · {item.collectionNames[0]}{/if}
            </p>
          {/if}
          <h3>{item.title}</h3>
          {#if item.summary}<p class="feed-summary">{item.summary}</p>{/if}
        </a>
        {#if item.type === 'pattern'}<SaveToLibrary
            sourceId={item.sourceId}
            entityId={item.id}
            compact
          />{/if}
      </li>
    {/each}
  </ol>
{/snippet}

<div class="mobile-library-results" role="region" aria-label={label}>
  {#if strictItems.length}{@render resultList(strictItems)}{/if}
  {#if broaderItems.length}
    <h3 class="broader-heading">Broader matches</h3>
    {@render resultList(broaderItems)}
  {/if}
</div>

<style>
  .mobile-library-results {
    min-width: 0;
  }
  .broader-heading {
    margin: 1.5rem 0 0.5rem;
    font-size: 0.95rem;
    font-weight: 650;
  }
  .pattern-feed {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: flex-start;
    gap: 0.25rem;
    padding: 1rem 0;
    border-bottom: 1px solid #deded8;
  }
  .feed-row {
    flex: 1;
    min-width: 0;
    text-decoration: none;
    color: var(--ink);
  }
  h3 {
    margin: 0;
    font-size: 0.95rem;
    line-height: 1.3;
    font-weight: 650;
    letter-spacing: -0.025em;
  }
  .result-type {
    margin: 0 0 0.3rem;
    color: var(--green-dark);
    font-size: 0.72rem;
    line-height: 1.5;
    font-weight: 650;
  }
  .feed-summary {
    margin: 0.3rem 0 0;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.5;
  }
  li:hover,
  li:focus-within {
    background: var(--entry-hover-background);
  }
  .feed-row:hover h3,
  .feed-row:focus-visible h3 {
    color: var(--entry-hover-color);
  }
  .feed-row:focus-visible {
    outline: 3px solid var(--focus-color);
    outline-offset: 3px;
  }
  li :global(.save-control) {
    align-self: flex-start;
    margin: -0.4rem -0.4rem 0 0;
  }
</style>

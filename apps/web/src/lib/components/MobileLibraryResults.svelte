<script lang="ts">
  import type { EntitySummary } from '$lib/server/commons';
  import { collectionItemHref } from '$lib/collection-navigation';
  import SaveToLibrary from './SaveToLibrary.svelte';

  let {
    items,
    collectionContext,
  }: {
    items: readonly EntitySummary[];
    collectionContext?: Pick<EntitySummary, 'sourceId' | 'id'>;
  } = $props();
  const itemHref = (item: EntitySummary) =>
    collectionContext ? collectionItemHref(item.url, collectionContext) : item.url;
</script>

<div class="mobile-library-results" role="region" aria-label="Library results">
  <ol class="pattern-feed">
    {#each items as item (`${item.sourceId}:${item.id}`)}
      <li>
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="feed-row" href={itemHref(item)}>
          <p class="feed-meta">
            {item.collectionNames?.[0] ?? item.type} · {item.sourceId === 'commons'
              ? 'Commons'
              : 'Mine'}{item.status === 'draft' ? ' · Draft' : ''}
          </p>
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
</div>

<style>
  .mobile-library-results {
    min-width: 0;
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
    padding: 1.25rem 0;
    border-bottom: 1px solid #deded8;
  }
  .feed-row {
    flex: 1;
    min-width: 0;
    text-decoration: none;
    color: var(--ink);
  }
  .feed-meta {
    margin: 0 0 0.5rem;
    color: var(--green-dark);
    font-size: 0.72rem;
    font-weight: 650;
    line-height: 1.5;
  }
  h3 {
    margin: 0;
    font-size: 1.15rem;
    line-height: 1.3;
    font-weight: 750;
    letter-spacing: -0.025em;
  }
  .feed-summary {
    margin: 0.5rem 0 0;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.6;
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

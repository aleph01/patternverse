<script lang="ts">
  import type { EntitySummary } from '$lib/server/commons';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import { patternIconForPattern } from '$lib/illustrations/pattern-mark-presets';
  import { collectionItemHref } from '$lib/collection-navigation';
  import type { LibraryCollections } from '$lib/library-collections';
  import CollectionExpansion from './CollectionExpansion.svelte';

  let {
    items,
    compact = false,
    layout = 'list',
    cardsOnMobile = false,
    startAt = 1,
    collectionContext,
    collections,
  }: {
    items: readonly EntitySummary[];
    compact?: boolean;
    layout?: 'list' | 'cards';
    cardsOnMobile?: boolean;
    startAt?: number;
    collectionContext?: Pick<EntitySummary, 'sourceId' | 'id'>;
    collections?: LibraryCollections;
  } = $props();
  const itemHref = (item: EntitySummary) =>
    collectionContext ? collectionItemHref(item.url, collectionContext) : item.url;
</script>

{#if compact}
  <ol class="entity-list compact" start={startAt}>
    {#each items as item, index (`${item.sourceId}:${item.id}`)}
      <li>
        <span class="index">{String(index + startAt).padStart(2, '0')}</span>
        <div class="entity-copy">
          <h3>
            <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
            <a href={itemHref(item)}>{item.title}</a>
          </h3>
          {#if item.summary}<p>{item.summary}</p>{/if}
        </div>
        <span class="entity-meta">
          {item.type} · {item.sourceId === 'commons' ? 'commons' : 'Mine'}
          {#if item.status === 'draft'}
            · Draft{/if}
        </span>
      </li>
    {/each}
  </ol>
{:else}
  <ol
    class="pattern-feed"
    class:card-grid={layout === 'cards'}
    class:mobile-cards={cardsOnMobile}
    start={startAt}
  >
    {#each items as item (`${item.sourceId}:${item.id}`)}
      <li class:expandable={collections?.has(`${item.sourceId}:${item.id}`)}>
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="feed-row" href={itemHref(item)}>
          <div class="feed-copy">
            <p class="feed-meta">
              {layout === 'cards' ? item.type : (item.collectionNames?.[0] ?? item.type)}<span>
                · {item.sourceId === 'commons' ? 'commons' : 'Mine'}{item.status === 'draft'
                  ? ' · Draft'
                  : ''}</span
              >
            </p>
            <h3>{item.title}</h3>
            {#if item.summary}<p class="feed-summary">{item.summary}</p>{/if}
          </div>
          {#if item.type === 'pattern'}<span class="feed-mark" aria-hidden="true"
              ><PatternIcon icon={patternIconForPattern(item.id, item.title)} decorative /></span
            >{/if}
        </a>
        {#if collections?.has(`${item.sourceId}:${item.id}`)}
          <CollectionExpansion
            collection={item}
            items={collections.get(`${item.sourceId}:${item.id}`) ?? []}
          />
        {/if}
      </li>
    {/each}
  </ol>
{/if}

<style>
  .pattern-feed {
    list-style: none;
    padding: 0;
    margin: 0;
    border-top: 1px solid #deded8;
  }
  .pattern-feed li {
    border-bottom: 1px solid #deded8;
  }
  .feed-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
    padding: 1.4rem 0.25rem;
    color: var(--ink);
    text-decoration: none;
  }
  .feed-copy {
    min-width: 0;
  }
  .feed-meta {
    margin: 0 0 0.5rem;
    font-size: 0.72rem;
    line-height: 1.5;
    color: var(--green-dark);
    font-weight: 650;
  }
  .feed-meta span {
    margin-left: 0.3em;
    color: var(--muted);
    font-weight: 450;
  }
  .feed-row h3 {
    margin: 0;
    font: inherit;
    font-size: clamp(1.15rem, 1.8vw, 1.4rem);
    font-weight: 750;
    letter-spacing: -0.025em;
    line-height: 1.3;
  }
  .feed-summary {
    max-width: 75ch;
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
    line-height: 1.6;
    color: var(--muted);
  }
  .feed-mark {
    display: block;
    width: 64px;
    height: 64px;
    flex: 0 0 64px;
  }
  .feed-row:hover,
  .feed-row:focus-visible {
    background: var(--entry-hover-background);
  }
  .feed-row:hover h3,
  .feed-row:focus-visible h3 {
    color: var(--entry-hover-color);
  }
  .feed-row:focus-visible {
    outline-offset: -3px;
  }
  .card-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 14px;
    border-top: 0;
  }
  .card-grid li {
    min-width: 0;
    border: 0;
  }
  .card-grid:has(.expandable) {
    align-items: start;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .card-grid li.expandable {
    border: 1px solid #deded8;
    border-radius: 5px;
    background: var(--paper, white);
  }
  .card-grid .expandable .feed-row {
    height: auto;
    border: 0;
  }
  .card-grid .expandable :global(.collection-expansion) {
    margin-inline: 20px;
  }
  .card-grid .feed-row {
    position: relative;
    display: block;
    height: 100%;
    padding: 20px;
    border: 1px solid #deded8;
    border-radius: 5px;
    background: white;
    transition:
      border-color 140ms ease,
      background-color 140ms ease;
  }
  .card-grid .feed-meta {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    min-height: 44px;
    margin-bottom: 14px;
    padding-right: 50px;
    font-size: 0.7rem;
  }
  .card-grid h3 {
    font-size: 1.2rem;
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
  .card-grid .feed-summary {
    margin-top: 10px;
    font-size: 0.8rem;
    line-height: 1.65;
  }
  .card-grid .feed-mark {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 44px;
    height: 44px;
  }
  .card-grid .feed-row:hover,
  .card-grid .feed-row:focus-visible {
    border-color: var(--green-dark);
    background: var(--entry-hover-background);
  }
  @container (min-width: 690px) {
    .card-grid {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .card-grid .feed-row {
      transition: none;
    }
  }
  @media (max-width: 800px) {
    .feed-mark {
      display: none;
    }
    .feed-row {
      gap: 0;
      padding: 1.25rem 0;
    }
    .feed-row h3 {
      font-size: 1.15rem;
    }
    .feed-summary {
      font-size: 0.9rem;
    }
    .card-grid {
      display: block;
      border-top: 1px solid #deded8;
    }
    .card-grid li {
      border-bottom: 1px solid #deded8;
    }
    .card-grid li.expandable {
      border: 0;
      border-bottom: 1px solid #deded8;
      border-radius: 0;
      background: transparent;
    }
    .card-grid .expandable :global(.collection-expansion) {
      margin-inline: 0;
    }
    .card-grid .feed-row {
      height: auto;
      padding: 1.25rem 0;
      border: 0;
      border-radius: 0;
      background: transparent;
    }
    .card-grid .feed-meta {
      display: block;
      min-height: 0;
      padding-right: 0;
      margin-bottom: 0.5rem;
      font-size: 0.72rem;
    }
    .card-grid h3 {
      font-size: 1.15rem;
    }
    .card-grid .feed-summary {
      margin-top: 0.5rem;
      font-size: 0.9rem;
    }
    .card-grid.mobile-cards {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
      border-top: 0;
    }
    .card-grid.mobile-cards:has(.expandable) {
      grid-template-columns: minmax(0, 1fr);
    }
    .card-grid.mobile-cards li {
      border-bottom: 0;
    }
    .card-grid.mobile-cards li.expandable {
      border: 1px solid #deded8;
      border-radius: 5px;
      background: var(--paper, white);
    }
    .card-grid.mobile-cards .expandable .feed-row {
      border: 0;
    }
    .card-grid.mobile-cards .expandable :global(.collection-expansion) {
      margin-inline: 20px;
    }
    .card-grid.mobile-cards .feed-row {
      padding: 20px;
      border: 1px solid #deded8;
      border-radius: 5px;
      background: white;
    }
    .card-grid.mobile-cards .feed-row:hover,
    .card-grid.mobile-cards .feed-row:focus-visible {
      background: var(--entry-hover-background);
      border-color: var(--green-dark);
    }
  }
</style>

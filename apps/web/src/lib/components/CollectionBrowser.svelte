<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Collection links are compiled summaries; switching context keeps the current, resolved pathname. */
  import { onMount, tick, type Snippet } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { List, X, ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight } from '@lucide/svelte';
  import type { EntityRef } from '@patternverse/schema';
  import {
    collectionForArticle,
    collectionItemHref,
    collectionKey,
    type CollectionOverview,
  } from '$lib/collection-navigation';

  let {
    overviews,
    article,
    title,
    actions,
  }: {
    overviews: readonly CollectionOverview[];
    article?: EntityRef;
    title?: string;
    actions?: Snippet;
  } = $props();
  const id = $props.id();
  let mounted = $state(false);
  let expanded = $state(false);
  let trigger = $state<HTMLButtonElement>();
  let panel = $state<HTMLElement>();
  const selected = $derived(
    article
      ? collectionForArticle(
          overviews,
          article,
          mounted ? page.url.searchParams.get('collection') : null,
        )
      : undefined,
  );
  const position = $derived(
    selected && article
      ? selected.items.findIndex(
          (item) => item.sourceId === article.sourceId && item.id === article.entityId,
        ) + 1
      : 0,
  );
  const previous = $derived(selected?.items[position - 2]);
  const next = $derived(selected?.items[position]);

  onMount(() => {
    mounted = true;
  });

  let lastArticleKey: string | undefined;
  $effect(() => {
    const key = article ? `${article.sourceId}:${article.entityId}` : undefined;
    if (lastArticleKey !== key) expanded = false;
    lastArticleKey = key;
  });

  $effect(() => {
    const currentPanel = expanded ? panel : undefined;
    // Re-center only when opening or changing collection/article, never while the user scrolls.
    const context = `${article?.sourceId}:${article?.entityId}:${selected ? collectionKey(selected.collection) : ''}`;
    if (!currentPanel || !context) return;
    let cancelled = false;
    void tick().then(() => {
      if (cancelled) return;
      const current = currentPanel.querySelector<HTMLElement>('[aria-current="page"]');
      const list = current?.closest<HTMLElement>('.collection-items');
      if (!current || !list) return;
      const row = current.getBoundingClientRect();
      const viewport = list.getBoundingClientRect();
      list.scrollTop += row.top - viewport.top - (list.clientHeight - row.height) / 2;
    });
    return () => {
      cancelled = true;
    };
  });

  function close(restoreFocus = true) {
    expanded = false;
    if (restoreFocus) trigger?.focus({ preventScroll: true });
  }

  async function switchCollection(key: string) {
    const target = overviews.find(({ collection }) => collectionKey(collection) === key);
    if (target)
      await goto(
        collectionItemHref(
          `${page.url.pathname}${page.url.search}${page.url.hash}`,
          target.collection,
        ),
        { noScroll: true, keepFocus: true },
      );
  }
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape' && expanded && !document.querySelector('dialog[open]')) {
      event.preventDefault();
      close();
    }
  }}
/>

{#if selected || title || actions}
  <div class="collection-browser">
    <div class="reading-actions" role="group" aria-label="Pattern navigation and actions">
      {#if selected}
        <div class="collection-controls">
          <button
            class="collection-tab"
            bind:this={trigger}
            type="button"
            aria-label={`Browse ${selected.collection.title}, ${position} of ${selected.items.length}`}
            aria-expanded={expanded}
            aria-controls={`${id}-panel`}
            title={selected.collection.title}
            onclick={() => (expanded = !expanded)}
          >
            <List size={18} aria-hidden="true" />
            <span class="collection-title">{selected.collection.title}</span>
            <span class="position">{position} / {selected.items.length}</span>
            <ChevronDown size={16} aria-hidden="true" />
          </button>
          <nav class="collection-paging" aria-label="Previous and next in collection">
            {#if previous}
              <a
                href={collectionItemHref(previous.url, selected.collection)}
                aria-label={`Previous pattern: ${previous.title}`}
                title={previous.title}
                onclick={() => close(false)}><ChevronLeft size={18} aria-hidden="true" /></a
              >
            {:else}
              <button type="button" disabled aria-label="Previous pattern"
                ><ChevronLeft size={18} aria-hidden="true" /></button
              >
            {/if}
            {#if next}
              <a
                href={collectionItemHref(next.url, selected.collection)}
                aria-label={`Next pattern: ${next.title}`}
                title={next.title}
                onclick={() => close(false)}><ChevronRight size={18} aria-hidden="true" /></a
              >
            {:else}
              <button type="button" disabled aria-label="Next pattern"
                ><ChevronRight size={18} aria-hidden="true" /></button
              >
            {/if}
          </nav>
        </div>
      {:else if title}<span class="reading-title">{title}</span>{/if}
      {#if actions}<div class="pattern-actions">{@render actions()}</div>{/if}
    </div>

    {#if selected && expanded}
      <section
        class="collection-panel"
        id={`${id}-panel`}
        aria-label="Collection overview"
        bind:this={panel}
      >
        <header class="collection-heading">
          <div class="collection-heading-title">
            {#if overviews.length > 1}
              <label class="visually-hidden" for={`${id}-collection`}>Browsing collection</label>
              <select
                id={`${id}-collection`}
                value={collectionKey(selected.collection)}
                onchange={(event) => void switchCollection(event.currentTarget.value)}
              >
                {#each overviews as overview (collectionKey(overview.collection))}<option
                    value={collectionKey(overview.collection)}>{overview.collection.title}</option
                  >{/each}
              </select>
            {:else}<h2>{selected.collection.title}</h2>{/if}
            <div class="collection-details">
              <span
                >{selected.items.length} {selected.items.length === 1 ? 'entry' : 'entries'}</span
              >
              <a href={selected.collection.url}
                >View collection <ArrowUpRight size={13} aria-hidden="true" /></a
              >
            </div>
          </div>
          <button
            class="close"
            type="button"
            aria-label="Close collection overview"
            onclick={() => close()}><X size={18} aria-hidden="true" /></button
          >
        </header>
        <nav class="collection-items" aria-label={`${selected.collection.title} contents`}>
          <ol>
            {#each selected.items as item, index (`${item.sourceId}:${item.id}`)}
              <li>
                <a
                  href={collectionItemHref(item.url, selected.collection)}
                  aria-current={item.sourceId === article?.sourceId && item.id === article?.entityId
                    ? 'page'
                    : undefined}
                  onclick={() => close(false)}
                >
                  <span class="number" aria-hidden="true">{index + 1}</span><span>{item.title}</span
                  >
                  {#if item.sourceId === article?.sourceId && item.id === article?.entityId}<span
                      class="current-label"
                      aria-hidden="true">Reading</span
                    >{/if}
                </a>
              </li>
            {/each}
          </ol>
        </nav>
      </section>
    {/if}
  </div>
{/if}

<style>
  .reading-actions {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem max(3vw, calc((100vw - 1440px) / 2));
    border-block: 1px solid #e4e5e1;
    background: var(--paper);
  }
  .collection-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
    max-width: 100%;
  }
  .collection-tab {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    min-width: 0;
    min-height: 44px;
    padding: 0.55rem 0.7rem;
    border: 1px solid #dcdfd9;
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    cursor: pointer;
  }
  .collection-tab :global(svg) {
    flex-shrink: 0;
  }
  .collection-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: min(28vw, 340px);
    font-size: 0.85rem;
    font-weight: 650;
  }
  .position {
    white-space: nowrap;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .collection-tab:hover,
  .collection-tab[aria-expanded='true'] {
    background: var(--mint);
    border-color: #7b9885;
    color: var(--green-dark);
  }
  .collection-paging {
    display: flex;
    gap: 0.3rem;
    flex-shrink: 0;
  }
  .collection-paging a,
  .collection-paging button,
  .close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid #dcdfd9;
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
  }
  .collection-paging a:hover {
    background: var(--mint);
    color: var(--green-dark);
  }
  .collection-paging button:disabled {
    opacity: 0.35;
  }
  .reading-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: 0.85rem;
    font-weight: 600;
  }
  .pattern-actions {
    margin-left: auto;
  }
  .collection-panel {
    padding: 0 max(3vw, calc((100vw - 1440px) / 2)) 1rem;
    border-bottom: 1px solid #e4e5e1;
    background: var(--paper);
  }
  .collection-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 1rem 0 0.75rem;
  }
  .collection-heading-title {
    min-width: 0;
    flex: 1;
  }
  .collection-heading h2 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    font-weight: 650;
    line-height: 1.4;
    overflow-wrap: anywhere;
  }
  .collection-heading select {
    display: block;
    max-width: 100%;
    min-height: 44px;
    margin-bottom: 0.5rem;
    padding: 0.4rem;
    border: 1px solid #deded8;
    background: var(--paper);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink);
  }
  .collection-details {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    font-size: 0.75rem;
    color: var(--muted);
  }
  .collection-details a {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    color: var(--green-dark);
    text-transform: none;
    text-decoration: none;
  }
  .collection-details a:hover {
    text-decoration: underline;
  }
  .close {
    flex-shrink: 0;
    border: 0;
    cursor: pointer;
  }
  .close:hover {
    background: var(--mint);
  }
  .collection-items {
    /* Site navigation is flex-centered; a scrollable document list must start at its top. */
    display: block;
    max-height: 252px;
    overflow-y: auto;
    overscroll-behavior: contain;
    scrollbar-width: auto;
    border-block: 1px solid #e5e5e0;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li + li {
    border-top: 1px solid #f0f0eb;
  }
  .collection-items a {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    min-height: 48px;
    padding: 0.7rem 0.8rem;
    border-left: 3px solid transparent;
    color: var(--ink);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 450;
    text-transform: none;
    line-height: 1.45;
    overflow-wrap: anywhere;
  }
  .number {
    flex: 0 0 20px;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .current-label {
    margin-left: auto;
    font-size: 0.7rem;
    font-weight: 400;
  }
  .collection-items a:hover {
    background: var(--entry-hover-background);
    color: var(--green-dark);
  }
  .collection-items a[aria-current='page'] {
    border-left-color: var(--green-dark);
    background: var(--mint);
    color: var(--green-dark);
    font-weight: 650;
  }
  button:focus-visible,
  a:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: -2px;
  }
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  @media (max-width: 800px) {
    .reading-actions {
      padding: 0.75rem 4vw;
    }
    .collection-controls {
      width: 100%;
    }
    .collection-tab {
      flex: 1;
    }
    .collection-title {
      flex: 1;
      max-width: none;
      text-align: left;
    }
    .pattern-actions {
      width: 100%;
      margin: 0;
    }
    .collection-panel {
      padding-inline: 4vw;
    }
    .current-label {
      display: none;
    }
    .reading-title {
      width: 100%;
    }
  }
</style>

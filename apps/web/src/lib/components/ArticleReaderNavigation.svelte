<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Compiled navigation paths receive the configured base before collection context is added. */
  import { onMount, tick } from 'svelte';
  import { base } from '$app/paths';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { ArrowLeft, ArrowRight, Check, ChevronDown, Layers, List, X } from '@lucide/svelte';
  import {
    navigationKey,
    navigationVerse,
    type ArticleNavigationContext,
    type NavigationCollection,
    type NavigationEntry,
  } from '$lib/article-navigation';
  import type { ArticleSection } from '$lib/article-sections';
  import { collectionItemHref } from '$lib/collection-navigation';

  let {
    context,
    sections,
  }: {
    context: ArticleNavigationContext;
    sections: readonly ArticleSection[];
  } = $props();
  type Mode = 'contents' | 'collection';
  const uid = $props.id();
  let root = $state<HTMLDivElement>();
  let panel = $state<HTMLElement>();
  let trigger: HTMLButtonElement | undefined;
  let mounted = $state(false);
  let mode = $state<Mode | null>(null);
  let activeId = $state('article-overview');
  let progress = $state(0);
  const collections = $derived(
    context.navigation.collections.filter((collection) =>
      collection.items.some((item) => navigationKey(item) === navigationKey(context.entity)),
    ),
  );
  const collection = $derived(
    collections.find(
      (entry) =>
        navigationKey(entry) === (mounted ? page.url.searchParams.get('collection') : null),
    ) ?? collections[0],
  );
  const verse = $derived(
    navigationVerse(
      context.navigation.verses,
      collection,
      context.verseKeys,
      mounted ? page.url.searchParams.get('verse') : null,
    ),
  );
  const position = $derived(
    collection?.items.findIndex((item) => navigationKey(item) === navigationKey(context.entity)) ??
      -1,
  );
  const previous = $derived(collection?.items[position - 1]);
  const next = $derived(collection?.items[position + 1]);
  const activeTitle = $derived(
    sections.find((section) => section.id === activeId)?.title ?? 'Overview',
  );

  function href(entry: NavigationEntry, parent: NavigationCollection = collection!) {
    return collectionItemHref(`${base}${entry.url}`, parent, verse ? navigationKey(verse) : null);
  }
  function close(restoreFocus = true) {
    mode = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
  async function show(nextMode: Mode, button: HTMLButtonElement) {
    if (mode === nextMode) {
      close();
      return;
    }
    trigger = button;
    mode = nextMode;
    await tick();
    panel?.querySelector<HTMLButtonElement>('.reader-close')?.focus({ preventScroll: true });
    centerCurrent();
  }
  function centerCurrent() {
    const list = panel?.querySelector<HTMLElement>('.reader-list');
    const current = list?.querySelector<HTMLElement>('[aria-current]');
    if (!list || !current) return;
    list.scrollTop +=
      current.getBoundingClientRect().top -
      list.getBoundingClientRect().top -
      (list.clientHeight - current.getBoundingClientRect().height) / 2;
  }
  async function switchCollection(key: string) {
    const target = collections.find((entry) => navigationKey(entry) === key);
    if (!target) return;
    const targetVerse = navigationVerse(
      context.navigation.verses,
      target,
      context.verseKeys,
      page.url.searchParams.get('verse'),
    );
    await goto(
      collectionItemHref(
        `${page.url.pathname}${page.url.search}${page.url.hash}`,
        target,
        targetVerse ? navigationKey(targetVerse) : null,
      ),
      { noScroll: true, keepFocus: true },
    );
  }
  onMount(() => {
    mounted = true;
    const media = window.matchMedia('(max-width: 800px)');
    const resize = () => {
      if (!media.matches) close(false);
    };
    media.addEventListener('change', resize);
    return () => media.removeEventListener('change', resize);
  });
  $effect(() => {
    // Rebuild targets after article navigation; section anchors come from the renderer.
    const headings = ['article-overview', ...sections.map(({ id }) => id)].flatMap((id) => {
      const element = document.getElementById(id);
      return element ? [{ id, element }] : [];
    });
    const article = root?.closest('main')?.querySelector('.entity-article');
    let frame: number | undefined;
    const update = () => {
      frame = undefined;
      const threshold = (root?.getBoundingClientRect().bottom ?? 96) + 16;
      activeId =
        headings.findLast(({ element }) => element.getBoundingClientRect().top <= threshold)?.id ??
        'article-overview';
      const bounds = article?.getBoundingClientRect();
      progress = bounds
        ? Math.round(
            Math.max(
              0,
              Math.min(
                1,
                (threshold - bounds.top) /
                  Math.max(1, bounds.height - window.innerHeight + threshold),
              ),
            ) * 100,
          )
        : 0;
    };
    const schedule = () => {
      frame ??= requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('hashchange', schedule);
    const observer = new ResizeObserver(schedule);
    if (article) observer.observe(article);
    return () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      window.removeEventListener('hashchange', schedule);
      observer.disconnect();
    };
  });
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape' && mode) {
      event.preventDefault();
      close();
    }
  }}
  onpointerdown={(event) => {
    if (mode && event.target instanceof Node && !root?.contains(event.target)) close(false);
  }}
  onfocusin={(event) => {
    if (mode && event.target instanceof Node && !root?.contains(event.target)) close(false);
  }}
/>

{#if collection || sections.length}
  <div class="reader-navigation" bind:this={root}>
    {#if collection}
      <button
        class="reader-collection"
        type="button"
        disabled={!mounted}
        aria-label={`Browse ${collection.title}, ${position + 1} of ${collection.items.length}`}
        aria-expanded={mode === 'collection'}
        aria-controls={`${uid}-panel`}
        onclick={(event) => void show('collection', event.currentTarget)}
      >
        <span class="collection-title">{collection.title}</span>
        <span class="collection-position">{position + 1} / {collection.items.length} articles</span>
        <ChevronDown size={15} aria-hidden="true" />
      </button>
    {:else}<div class="reader-title">{context.entity.title}</div>{/if}
    <nav
      class="reader-controls"
      class:without-collection={!collection}
      aria-label="Article reader navigation"
    >
      {#if collection}
        {#if previous}<a
            href={href(previous)}
            aria-label={`Previous article: ${previous.title}`}
            title={previous.title}
            onclick={() => close(false)}><ArrowLeft size={16} aria-hidden="true" />Prev</a
          >
        {:else}<button type="button" disabled aria-label="Previous article"
            ><ArrowLeft size={16} aria-hidden="true" />Prev</button
          >{/if}
      {/if}
      {#if sections.length}
        <button
          class="reader-contents"
          aria-label={`On this page: ${activeTitle}`}
          type="button"
          disabled={!mounted}
          aria-expanded={mode === 'contents'}
          aria-controls={`${uid}-panel`}
          onclick={(event) => void show('contents', event.currentTarget)}
        >
          <List size={17} aria-hidden="true" /><span
            ><small>On this page</small><strong title={activeTitle}>{activeTitle}</strong></span
          >
        </button>
      {:else}<span class="reader-current-title">{context.entity.title}</span>{/if}
      {#if collection}
        {#if next}<a
            href={href(next)}
            aria-label={`Next article: ${next.title}`}
            title={next.title}
            onclick={() => close(false)}>Next<ArrowRight size={16} aria-hidden="true" /></a
          >
        {:else}<a
            href={href(collection)}
            aria-label={`Back to collection: ${collection.title}`}
            onclick={() => close(false)}>All<Layers size={16} aria-hidden="true" /></a
          >{/if}
      {/if}
    </nav>
    <div
      class="reader-progress"
      role="progressbar"
      aria-label="Article progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={progress}
    >
      <span style:width={`${progress}%`}></span>
    </div>
    {#if mode}
      <section
        class="reader-panel"
        id={`${uid}-panel`}
        aria-label="Reader navigation"
        bind:this={panel}
      >
        <header class="reader-panel-heading">
          <div>
            <small>{mode === 'collection' ? 'In this collection' : 'In this article'}</small>
            <h2>{mode === 'collection' ? collection?.title : context.entity.title}</h2>
          </div>
          <button
            type="button"
            class="reader-close"
            aria-label="Close reader navigation"
            onclick={() => close()}><X size={18} aria-hidden="true" /></button
          >
        </header>
        {#if mode === 'collection' && collections.length > 1}
          <label class="collection-select"
            >Browsing collection
            <select
              value={navigationKey(collection!)}
              onchange={(event) => void switchCollection(event.currentTarget.value)}
            >
              {#each collections as entry (navigationKey(entry))}<option
                  value={navigationKey(entry)}>{entry.title}</option
                >{/each}
            </select>
          </label>
        {/if}
        <div id={`${uid}-list`}>
          <nav
            class="reader-list"
            aria-label={mode === 'contents' ? 'Article contents' : 'Collection articles'}
          >
            {#if mode === 'contents'}
              <a
                href="#article-overview"
                aria-current={activeId === 'article-overview' ? 'location' : undefined}
                onclick={() => close(false)}
                ><span class="entry-number">—</span><span>Overview</span
                >{#if activeId === 'article-overview'}<Check size={16} aria-hidden="true" />{/if}</a
              >
              {#each sections as section, index (section.id)}
                <a
                  href={`#${encodeURIComponent(section.id)}`}
                  aria-label={section.title}
                  class:subsection={section.depth === 3}
                  aria-current={activeId === section.id ? 'location' : undefined}
                  onclick={() => close(false)}
                >
                  <span class="entry-number">{String(index + 1).padStart(2, '0')}</span><span
                    >{section.title}</span
                  >
                  {#if activeId === section.id}<Check size={16} aria-hidden="true" />{/if}
                </a>
              {/each}
            {:else if collection}
              {#each collection.items as item, index (navigationKey(item))}
                <a
                  href={href(item)}
                  aria-label={item.title}
                  aria-current={index === position ? 'page' : undefined}
                  onclick={() => close(false)}
                >
                  <span class="entry-number">{String(index + 1).padStart(2, '0')}</span>
                  <span
                    >{item.title}{#if index === position}<small>You are reading this</small
                      >{/if}</span
                  >
                  {#if index === position}<Check size={16} aria-hidden="true" />{:else}<ArrowRight
                      size={16}
                      aria-hidden="true"
                    />{/if}
                </a>
              {/each}
            {/if}
          </nav>
        </div>
      </section>
    {/if}
  </div>
{/if}

<style>
  .reader-navigation {
    display: none;
  }
  @media (max-width: 800px) {
    .reader-navigation {
      display: block;
      position: sticky;
      top: 0;
      z-index: 20;
      background: var(--paper);
      color: var(--ink);
    }
    button,
    a {
      color: inherit;
      font: inherit;
      cursor: pointer;
    }
    button {
      background: transparent;
      border: 0;
    }
    button:disabled {
      opacity: 0.35;
      cursor: default;
    }
    .reader-collection,
    .reader-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      width: 100%;
      min-height: 44px;
      padding: 0.4rem 3vw;
      border-bottom: 1px solid #dedfd8;
      text-align: left;
    }
    .collection-title,
    .reader-title {
      font-size: 0.78rem;
      font-weight: 600;
    }
    .collection-title {
      flex: 1;
      min-width: 0;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .collection-position {
      color: var(--ink-muted);
      font-size: 0.68rem;
      white-space: nowrap;
    }
    .reader-collection :global(svg) {
      flex-shrink: 0;
    }
    .reader-controls {
      display: grid;
      grid-template-columns: 64px minmax(0, 1fr) 64px;
      gap: 0.25rem;
      padding: 0.25rem 2vw;
      text-transform: none;
    }
    .reader-controls.without-collection {
      grid-template-columns: minmax(0, 1fr);
    }
    .reader-controls > a,
    .reader-controls > button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.35rem;
      min-height: 44px;
      padding: 0.25rem;
      background: transparent;
      color: var(--ink);
      font-size: 0.75rem;
      font-weight: 500;
      text-decoration: none;
    }
    .reader-controls > a:hover,
    .reader-controls > button:hover:not(:disabled) {
      background: #f6f7f3;
    }
    .reader-controls :global(svg) {
      flex-shrink: 0;
    }
    .reader-controls .reader-contents {
      justify-content: start;
      text-align: left;
      min-width: 0;
      gap: 0.5rem;
    }
    .reader-contents > span {
      min-width: 0;
    }
    .reader-contents small {
      display: block;
      font-size: 0.65rem;
      color: var(--ink-muted);
      line-height: 1.4;
    }
    .reader-contents strong,
    .reader-current-title {
      display: block;
      font-size: 0.7rem;
      line-height: 1.5;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .reader-progress {
      height: 2px;
      background: #dedfd8;
    }
    .reader-progress span {
      display: block;
      height: 100%;
      background: var(--green-dark);
    }
    .reader-panel {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      padding: 1rem 3vw;
      background: var(--paper);
      border-bottom: 1px solid var(--ink);
      box-shadow: 0 10px 16px #18181412;
    }
    .reader-panel-heading {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: start;
    }
    .reader-panel-heading > div {
      min-width: 0;
    }
    .reader-panel-heading small {
      color: var(--ink-muted);
      font-size: 0.7rem;
    }
    .reader-panel-heading h2 {
      margin: 0.25rem 0 0.75rem;
      font-size: 1.4rem;
      line-height: 1.2;
      font-weight: 700;
      letter-spacing: -0.04em;
      overflow-wrap: anywhere;
    }
    .reader-close {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      flex-shrink: 0;
    }
    .reader-list {
      display: block;
      max-height: min(45dvh, calc(100dvh - 21rem));
      overflow-y: auto;
      overscroll-behavior: contain;
      padding: 0.25rem;
      text-transform: none;
    }
    .reader-list a {
      display: grid;
      grid-template-columns: 1.25rem minmax(0, 1fr) 1rem;
      gap: 0.65rem;
      align-items: center;
      min-height: 48px;
      padding: 0.6rem 0.5rem;
      font-size: 0.82rem;
      line-height: 1.4;
      font-weight: 400;
      text-decoration: none;
      overflow-wrap: anywhere;
    }
    .reader-list a[aria-current] {
      color: var(--green-dark);
      background: var(--mint);
      font-weight: 600;
    }
    .reader-list a:hover {
      background: #f6f7f3;
    }
    .reader-list a.subsection {
      padding-left: 1rem;
    }
    .entry-number,
    .reader-list small {
      color: var(--ink-muted);
      font-size: 0.65rem;
      font-weight: 400;
    }
    .reader-list small {
      display: block;
      margin-top: 0.2rem;
    }
    .collection-select {
      display: grid;
      gap: 0.3rem;
      color: var(--ink-muted);
      font-size: 0.7rem;
      margin: 0.5rem 0;
    }
    .collection-select select {
      width: 100%;
      min-height: 44px;
      padding: 0.4rem;
      color: var(--ink);
      background: var(--paper);
      border: 1px solid #dedfd8;
      font-size: 1rem;
    }
  }
</style>

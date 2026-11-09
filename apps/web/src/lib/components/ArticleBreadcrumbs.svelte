<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Public navigation URLs are compiled locally and receive the configured base below. */
  import { onMount, onDestroy, tick } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { base, resolve } from '$app/paths';
  import { page } from '$app/state';
  import { Check, ChevronDown, ChevronRight, ArrowLeft, ArrowUpRight, X } from '@lucide/svelte';
  import {
    navigationKey,
    navigationVerse,
    type ArticleNavigation,
    type ArticleNavigationContext,
    type NavigationCollection,
    type NavigationEntry,
  } from '$lib/article-navigation';
  import { collectionItemHref } from '$lib/collection-navigation';
  import { loadArticleNavigation } from '$lib/client/article-navigation';
  import { verseAccentClass } from '$lib/verse-accent';

  let { context }: { context: ArticleNavigationContext } = $props();
  type Level = 'verses' | 'collections' | 'articles';
  const uid = $props.id();
  let root: HTMLDivElement;
  let dialog: HTMLDialogElement;
  let trigger: HTMLButtonElement | undefined;
  let mobile = $state(false);
  let mounted = $state(false);
  let open = $state(false);
  let level = $state<Level>('collections');
  let browsingVerse = $state('');
  let browsingCollection = $state('');
  let loaded = $state<{ path: string; navigation: ArticleNavigation }>();
  let loading = $state(false);
  let failed = $state(false);
  let popoverLeft = $state(0);
  const catalog = $derived(
    loaded?.path === context.asset.path ? loaded.navigation : context.navigation,
  );
  const selectedCollection = $derived(
    context.navigation.collections.find((collection) =>
      context.entity.type === 'collection'
        ? navigationKey(collection) === navigationKey(context.entity)
        : navigationKey(collection) === (mounted ? page.url.searchParams.get('collection') : null),
    ) ?? context.navigation.collections[0],
  );
  const selectedVerse = $derived(
    navigationVerse(
      catalog.verses,
      selectedCollection,
      context.verseKeys,
      mounted ? page.url.searchParams.get('verse') : null,
    ),
  );
  const verse = $derived(catalog.verses.find((entry) => navigationKey(entry) === browsingVerse));
  const collection = $derived(
    catalog.collections.find((entry) => navigationKey(entry) === browsingCollection),
  );
  const collections = $derived(
    verse
      ? catalog.collections.filter((entry) => verse.collectionKeys.includes(navigationKey(entry)))
      : [],
  );
  const heading = $derived(
    level === 'verses'
      ? 'Library'
      : level === 'collections'
        ? (verse?.title ?? 'Collections')
        : (collection?.title ?? 'Collection'),
  );

  function href(entry: NavigationEntry, parent?: NavigationCollection) {
    const url = `${base}${entry.url}`;
    return parent ? collectionItemHref(url, parent, verse ? navigationKey(verse) : null) : url;
  }
  function verseHref(key: string) {
    return `${resolve('/library')}?verse=${encodeURIComponent(key)}`;
  }
  async function ensureNavigation() {
    const asset = context.asset;
    if (loaded?.path === asset.path || loading) return;
    loading = true;
    failed = false;
    try {
      const navigation = await loadArticleNavigation(asset);
      if (context.asset.path === asset.path) loaded = { path: asset.path, navigation };
    } catch {
      if (context.asset.path === asset.path) failed = true;
    } finally {
      loading = false;
    }
  }
  function close(restoreFocus = true) {
    if (dialog?.open) dialog.close();
    open = false;
    if (restoreFocus && trigger?.isConnected) trigger.focus({ preventScroll: true });
  }
  async function focusPanel() {
    await tick();
    const panel = mobile ? dialog : root.querySelector<HTMLElement>('.breadcrumb-popover');
    panel?.querySelector<HTMLButtonElement>('.close-navigation')?.focus({ preventScroll: true });
  }
  async function show(next: Level, button: HTMLButtonElement) {
    if (open && trigger === button) {
      close();
      return;
    }
    trigger = button;
    popoverLeft = Math.min(
      Math.max(0, button.getBoundingClientRect().left - root.getBoundingClientRect().left),
      Math.max(0, root.clientWidth - 390),
    );
    level = next;
    browsingVerse = selectedVerse ? navigationKey(selectedVerse) : '';
    browsingCollection = selectedCollection ? navigationKey(selectedCollection) : '';
    open = true;
    if (mobile) {
      await tick();
      if (!dialog.open) dialog.showModal();
    }
    void ensureNavigation();
    await focusPanel();
  }
  async function chooseVerse(key: string) {
    browsingVerse = key;
    level = 'collections';
    await focusPanel();
  }
  async function chooseCollection(key: string) {
    browsingCollection = key;
    level = 'articles';
    await focusPanel();
  }
  onMount(() => {
    mounted = true;
    const media = window.matchMedia('(max-width: 800px)');
    mobile = media.matches;
    const change = () => {
      close();
      mobile = media.matches;
    };
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  });
  onDestroy(() => {
    dialog?.close();
  });
  afterNavigate(() => close(false));
  $effect(() => {
    if (!open || !mobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  });
  function outside(event: PointerEvent) {
    if (event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }
  let backdropPressed = false;
</script>

<svelte:window
  onpointerdown={(event) => {
    if (open && !mobile && event.target instanceof Node && !root.contains(event.target))
      close(false);
  }}
  onfocusin={(event) => {
    if (open && !mobile && event.target instanceof Node && !root.contains(event.target))
      close(false);
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape' && open && !mobile) {
      event.preventDefault();
      close();
    }
  }}
/>

{#snippet picker()}
  <header class="picker-heading">
    <div>
      {#if level === 'articles' && verse}
        <button
          type="button"
          class="picker-back"
          onclick={() => void chooseVerse(navigationKey(verse))}
        >
          <ArrowLeft size={14} aria-hidden="true" />{verse.title}
        </button>
      {/if}
      <p>
        {level === 'verses'
          ? 'Verses'
          : level === 'collections'
            ? 'Collections in this Verse'
            : 'In this collection'}
      </p>
      <h2 id={`${uid}-${mobile ? 'sheet' : 'popover'}-heading`}>{heading}</h2>
    </div>
    <button
      type="button"
      class="close-navigation"
      aria-label="Close breadcrumb navigation"
      onclick={() => close()}><X size={18} aria-hidden="true" /></button
    >
  </header>
  <div class="picker-list" aria-live="polite">
    {#if loading}<p class="navigation-status" role="status">Loading navigation…</p>{/if}
    {#if failed}
      <div class="navigation-status" role="status">
        <p>Other collections are unavailable right now. You can still browse this collection.</p>
        <button type="button" onclick={() => void ensureNavigation()}>Retry navigation</button>
      </div>
    {/if}
    {#if level === 'verses'}
      {#each catalog.verses as entry (navigationKey(entry))}
        <button
          type="button"
          class="picker-row"
          aria-pressed={navigationKey(entry) ===
            (selectedVerse ? navigationKey(selectedVerse) : '')}
          onclick={() => void chooseVerse(navigationKey(entry))}
        >
          <span
            >{entry.title}<small
              >{entry.collectionKeys.length}
              {entry.collectionKeys.length === 1 ? 'collection' : 'collections'}</small
            ></span
          ><ChevronRight size={16} aria-hidden="true" />
        </button>
      {/each}
    {:else if level === 'collections'}
      {#each collections as entry (navigationKey(entry))}
        <button
          type="button"
          class="picker-row"
          aria-pressed={navigationKey(entry) ===
            (selectedCollection ? navigationKey(selectedCollection) : '')}
          onclick={() => void chooseCollection(navigationKey(entry))}
        >
          <span
            >{entry.title}<small
              >{entry.items.length} {entry.items.length === 1 ? 'entry' : 'entries'}</small
            ></span
          >
          {#if navigationKey(entry) === (selectedCollection ? navigationKey(selectedCollection) : '')}<Check
              size={16}
              aria-hidden="true"
            />{:else}<ChevronRight size={16} aria-hidden="true" />{/if}
        </button>
      {:else}{#if !loading && !failed}<p class="navigation-status">
            No collections in this Verse yet.
          </p>{/if}{/each}
    {:else if collection}
      {#each collection.items as item (navigationKey(item))}
        <a
          class="picker-row"
          href={href(item, collection)}
          aria-current={navigationKey(item) === navigationKey(context.entity) ? 'page' : undefined}
          onclick={() => close(false)}
        >
          <span>{item.title}</span>{#if navigationKey(item) === navigationKey(context.entity)}<Check
              size={16}
              aria-hidden="true"
            />{:else}<ArrowUpRight size={15} aria-hidden="true" />{/if}
        </a>
      {:else}<p class="navigation-status">No entries in this collection yet.</p>{/each}
    {/if}
  </div>
  <footer class="picker-footer">
    <span>Reading {context.entity.title}</span>
    {#if level === 'articles' && collection}<a href={href(collection)} onclick={() => close(false)}
        >View collection <ArrowUpRight size={13} aria-hidden="true" /></a
      >
    {:else if level === 'collections' && verse}<a
        href={verseHref(navigationKey(verse))}
        onclick={() => close(false)}>View Verse <ArrowUpRight size={13} aria-hidden="true" /></a
      >
    {:else}<a href={resolve('/library')} onclick={() => close(false)}
        >Open library <ArrowUpRight size={13} aria-hidden="true" /></a
      >{/if}
  </footer>
{/snippet}

<div class="article-breadcrumbs" bind:this={root}>
  <nav aria-label="Breadcrumb" class="breadcrumb-path">
    <ol>
      <li class="library-crumb">
        <button
          type="button"
          class="crumb"
          disabled={!mounted}
          aria-haspopup="dialog"
          aria-expanded={open && level === 'verses'}
          aria-controls={`${uid}-${mobile ? 'sheet' : 'popover'}`}
          onclick={(event) => void show('verses', event.currentTarget)}>Library</button
        ><span class="separator" aria-hidden="true">/</span>
      </li>
      {#if selectedVerse}
        <li class="verse-crumb">
          <button
            type="button"
            class="crumb"
            disabled={!mounted}
            aria-haspopup="dialog"
            aria-expanded={open && level === 'collections'}
            aria-controls={`${uid}-${mobile ? 'sheet' : 'popover'}`}
            onclick={(event) => void show('collections', event.currentTarget)}
            ><span class="verse-dot {verseAccentClass(selectedVerse.id)}" aria-hidden="true"
            ></span>{selectedVerse.title}<ChevronDown size={12} aria-hidden="true" /></button
          ><span class="separator verse-separator" aria-hidden="true">/</span>
        </li>
      {/if}
      {#if selectedCollection && context.entity.type !== 'collection'}
        <li class="collection-crumb">
          <button
            type="button"
            class="crumb collection-crumb-button"
            disabled={!mounted}
            aria-haspopup="dialog"
            aria-expanded={open && level === 'articles'}
            aria-controls={`${uid}-${mobile ? 'sheet' : 'popover'}`}
            onclick={(event) => void show('articles', event.currentTarget)}
            >{selectedCollection.title}<ChevronDown size={12} aria-hidden="true" /></button
          ><span class="separator" aria-hidden="true">/</span>
        </li>
      {/if}
      <li class="article-crumb"><span aria-current="page">{context.entity.title}</span></li>
    </ol>
  </nav>
  {#if open && !mobile}
    <div
      class="breadcrumb-popover"
      style:left={`${popoverLeft}px`}
      id={`${uid}-popover`}
      role="dialog"
      tabindex="-1"
      aria-modal="false"
      aria-labelledby={`${uid}-popover-heading`}
    >
      {@render picker()}
    </div>
  {/if}
</div>

<dialog
  bind:this={dialog}
  class="breadcrumb-sheet"
  id={`${uid}-sheet`}
  aria-labelledby={`${uid}-sheet-heading`}
  onclose={() => {
    open = false;
  }}
  oncancel={(event) => {
    event.preventDefault();
    close();
  }}
  onpointerdown={(event) => {
    backdropPressed = outside(event);
  }}
  onpointerup={(event) => {
    if (backdropPressed && outside(event)) close();
    backdropPressed = false;
  }}
>
  {#if open && mobile}<div class="sheet-handle" aria-hidden="true"></div>
    {@render picker()}{/if}
</dialog>

<style>
  .article-breadcrumbs {
    position: relative;
    min-width: 0;
  }
  .breadcrumb-path {
    display: block;
    text-transform: none;
    font-weight: 450;
  }
  ol {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 2px;
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    display: flex;
    align-items: center;
    min-width: 0;
    gap: 3px;
  }
  .crumb {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    max-width: 100%;
    padding: 6px 8px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.8rem;
    text-align: left;
    overflow-wrap: anywhere;
    cursor: pointer;
  }
  .crumb :global(svg) {
    flex-shrink: 0;
  }
  .crumb:hover {
    background: #f3f5ef;
    color: var(--ink);
  }
  .crumb[aria-expanded='true'] {
    background: var(--mint);
    color: var(--green-dark);
  }
  .separator {
    color: var(--muted);
    font-size: 0.75rem;
    margin: 0 3px;
  }
  .verse-dot {
    width: 8px;
    height: 8px;
    flex-shrink: 0;
    background: var(--verse-rest);
    border-radius: 2px;
  }
  .article-crumb {
    padding: 6px 8px;
    font-size: 0.8rem;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .breadcrumb-popover {
    position: absolute;
    z-index: 30;
    top: calc(100% + 6px);
    left: 0;
    width: min(390px, calc(100vw - 2rem));
    max-height: min(70dvh, 640px);
    display: flex;
    flex-direction: column;
    padding: 8px;
    border: 1px solid #deded8;
    border-radius: 7px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 12px 32px #1818141c;
  }
  .picker-heading {
    display: flex;
    flex-shrink: 0;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
    padding: 10px 10px 13px;
  }
  .picker-heading > div {
    min-width: 0;
  }
  .picker-heading p {
    margin: 0 0 5px;
    font-size: 0.65rem;
    font-weight: 750;
    letter-spacing: 0.08em;
    color: var(--muted);
    text-transform: uppercase;
  }
  .picker-heading h2 {
    margin: 0;
    font-size: 1.05rem;
    line-height: 1.3;
    font-weight: 750;
    letter-spacing: -0.02em;
    overflow-wrap: anywhere;
  }
  .close-navigation {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--ink);
    cursor: pointer;
  }
  .close-navigation:hover {
    background: #f3f5ef;
  }
  .picker-back {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    padding: 0;
    margin: -5px 0 5px;
    border: 0;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
  }
  .picker-list {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    display: grid;
    align-content: start;
    gap: 3px;
  }
  .picker-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    width: 100%;
    min-height: 48px;
    padding: 11px 12px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--ink);
    font: inherit;
    font-size: 0.85rem;
    font-weight: 450;
    line-height: 1.4;
    text-align: left;
    text-transform: none;
    text-decoration: none;
    cursor: pointer;
  }
  .picker-row > span {
    min-width: 0;
    overflow-wrap: anywhere;
  }
  .picker-row :global(svg) {
    flex-shrink: 0;
  }
  .picker-row small {
    display: block;
    margin-top: 3px;
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--muted);
  }
  .picker-row[aria-pressed='true'] {
    background: var(--mint);
  }
  .picker-row[aria-current='page'] {
    color: var(--green-dark);
    background: #f3f5ef;
    font-weight: 700;
  }
  .picker-row:hover {
    background: var(--entry-hover-background, #f3f5ef);
  }
  .picker-footer {
    display: flex;
    justify-content: space-between;
    flex-wrap: wrap;
    flex-shrink: 0;
    gap: 8px;
    padding: 12px 10px 4px;
    margin-top: 10px;
    border-top: 1px solid #deded8;
    font-size: 0.7rem;
    color: var(--muted);
  }
  .picker-footer span {
    overflow-wrap: anywhere;
  }
  .picker-footer a {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    color: var(--green-dark);
    min-height: 32px;
  }
  .navigation-status {
    padding: 10px 12px;
    color: var(--muted);
    font-size: 0.8rem;
  }
  .navigation-status p {
    margin: 0 0 8px;
  }
  .navigation-status button {
    min-height: 44px;
    font: inherit;
    color: var(--green-dark);
  }
  .breadcrumb-sheet {
    position: fixed;
    inset: auto 0 0;
    width: 100%;
    max-width: 600px;
    max-height: calc(90dvh - env(safe-area-inset-top));
    margin: 0 auto;
    padding: 10px 12px calc(16px + env(safe-area-inset-bottom));
    border: 1px solid #deded8;
    border-bottom: 0;
    border-radius: 15px 15px 0 0;
    background: var(--paper);
    color: var(--ink);
  }
  .breadcrumb-sheet[open] {
    display: flex;
    flex-direction: column;
  }
  .breadcrumb-sheet::backdrop {
    background: #18181455;
  }
  .sheet-handle {
    flex-shrink: 0;
    width: 35px;
    height: 4px;
    margin: 0 auto 10px;
    border-radius: 9px;
    background: #deded8;
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: -2px;
  }
  @media (max-width: 800px) {
    .breadcrumb-path ol {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      justify-content: start;
      gap: 0 2px;
    }
    .library-crumb {
      grid-column: 1;
      grid-row: 1;
    }
    .verse-crumb {
      grid-column: 2;
      grid-row: 1;
    }
    .verse-separator,
    .article-crumb,
    .collection-crumb > .separator {
      display: none;
    }
    .collection-crumb {
      grid-column: 1 / -1;
      grid-row: 2;
    }
    .collection-crumb-button {
      font-weight: 650;
    }
    .breadcrumb-sheet .picker-heading h2 {
      font-size: 1.2rem;
    }
    .breadcrumb-sheet .picker-row {
      min-height: 54px;
      font-size: 0.9rem;
    }
    .picker-footer a {
      min-height: 44px;
    }
  }
</style>

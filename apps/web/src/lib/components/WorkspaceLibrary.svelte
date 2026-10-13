<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount } from 'svelte';
  import { Bookmark, Library, Search, SlidersHorizontal, X } from '@lucide/svelte';
  import type { EntityType } from '@patternverse/schema';
  import type { RawEntity, SavedLibraryEntry } from '@patternverse/workspace';
  import {
    type BrowsableLibraryType,
    type LibrarySearchDocument,
    libraryEntryKey,
    savedLibraryKeys,
    isInMyLibrary,
  } from '@patternverse/workspace/library';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import type { EntitySummary } from '$lib/server/commons';
  import EntityList from './EntityList.svelte';
  import PaginatedEntityList from './PaginatedEntityList.svelte';
  import LibraryViewSwitch from './LibraryViewSwitch.svelte';
  import MobileLibraryCollections from './MobileLibraryCollections.svelte';
  import MobileLibraryResults from './MobileLibraryResults.svelte';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';
  import type { LibraryRatingFilter } from '$lib/client/library-ratings';
  import LibraryRatingFilterControl from './LibraryRatingFilter.svelte';
  import type { WorkspaceUsefulness } from '@patternverse/workspace';
  import { libraryCollections } from '$lib/library-collections';
  import {
    createWorkspaceLibraryCatalog,
    workspaceLibraryView,
    initialLibraryCategory,
    type LibraryVerse,
    type LibraryCategory,
    type LibraryScope,
  } from '$lib/client/workspace-library-view';

  const defaultTypes: readonly BrowsableLibraryType[] = ['pattern', 'collection'];
  let {
    commons,
    commonsSearchDocuments,
    commonsVerses = [],
    query = $bindable(''),
    initialTypes = defaultTypes,
    limit,
    eyebrow = 'From your unified library',
    heading = 'Start somewhere useful',
    showControls = true,
    mobileCollections = false,
    featuredIds = [],
    viewAllHref,
    viewAllLabel = 'View the full library →',
  }: {
    commons: readonly EntitySummary[];
    commonsSearchDocuments: readonly LibrarySearchDocument[];
    commonsVerses?: readonly LibraryVerse[];
    query?: string;
    initialTypes?: readonly EntityType[];
    limit?: number;
    eyebrow?: string;
    heading?: string;
    showControls?: boolean;
    mobileCollections?: boolean;
    featuredIds?: readonly string[];
    viewAllHref?: string;
    viewAllLabel?: string;
  } = $props();

  let personal = $state<readonly RawEntity[]>([]);
  let ready = $state(false);
  let message = $state('');
  let savedEntries = $state<readonly SavedLibraryEntry[]>([]);
  let scope = $state<LibraryScope>('explore');
  let scopeChosen = false;
  let ratingFilter = $state<LibraryRatingFilter>('any');
  let ratingsAvailable = $state(false);
  let ratings = $state<readonly WorkspaceUsefulness[]>([]);
  const collections = $derived(libraryCollections(commons, personal));
  type Layout = 'list' | 'cards';
  let layout = $state<Layout>('cards');
  let selectedVerse = $state('all');
  let searchInput = $state<HTMLInputElement>();
  let narrowScreen = $state(false);
  const mobileView = $derived(mobileCollections && showControls && narrowScreen);
  let mobileFiltersOpen = $state(false);
  let selectedCollection = $state('all');
  const uid = $props.id();
  const filterPanelId = uid + '-filters';
  function clearSearch() {
    query = '';
    searchInput?.focus({ preventScroll: true });
  }
  const typeOptions: ReadonlyArray<{ value: BrowsableLibraryType; label: string }> = [
    { value: 'collection', label: 'Collections' },
    { value: 'pattern', label: 'Patterns' },
  ];
  // Both are mount-time configuration; interaction owns the category state afterward.
  // svelte-ignore state_referenced_locally
  const initialCategory = initialLibraryCategory(initialTypes);
  let activeCategory = $state<LibraryCategory>(initialCategory);
  // svelte-ignore state_referenced_locally
  const featuredRank = new Map(featuredIds.map((id, index) => [id, index] as const));

  const catalog = $derived(
    createWorkspaceLibraryCatalog({
      commons,
      commonsSearchDocuments,
      commonsVerses,
      personal,
      editorHref: resolve('/editor'),
    }),
  );
  const view = $derived(
    workspaceLibraryView(catalog, {
      savedEntries,
      ratings,
      scope,
      selectedVerse,
      query,
      category: activeCategory,
      initialCategory,
      ratingFilter,
      showControls,
      featuredRank,
      limit,
    }),
  );
  const visibleVerses = $derived(view.visibleVerses);
  const myLibraryCount = $derived(view.myLibraryCount);
  const emptyLibrary = $derived(view.emptyLibrary);
  const hasSearchOrFilters = $derived(view.hasSearchOrFilters);
  const results = $derived(view.results);
  const visibleResults = $derived(view.visibleResults);
  const resultLabel = $derived(view.resultLabel);
  const collectionView = $derived(
    workspaceLibraryView(catalog, {
      savedEntries,
      ratings,
      scope: 'explore',
      selectedVerse,
      query: '',
      category: 'collection',
      initialCategory,
      ratingFilter: 'any',
      showControls,
      featuredRank,
    }),
  );
  const mobileCollectionEntries = $derived.by(() => {
    const savedKeys = savedLibraryKeys(savedEntries);
    const mine = new Set(
      catalog.library.entries
        .filter((entry) => isInMyLibrary(entry, savedKeys))
        .map(libraryEntryKey),
    );
    return collectionView.results.filter(
      (entry) =>
        scope === 'explore' ||
        mine.has(libraryEntryKey(entry)) ||
        collections
          .get(libraryEntryKey(entry))
          ?.some((member) => mine.has(libraryEntryKey(member))),
    );
  });
  const collectionContext = $derived(
    mobileCollectionEntries.find((entry) => libraryEntryKey(entry) === selectedCollection),
  );
  const mobileCollectionSearch = $derived(
    workspaceLibraryView(catalog, {
      savedEntries,
      ratings,
      scope: 'explore',
      selectedVerse,
      query,
      category: activeCategory,
      initialCategory,
      ratingFilter,
      showControls,
      featuredRank,
    }),
  );
  const displayedResults = $derived.by(() => {
    if (!mobileView || !collectionContext) return visibleResults;
    // A saved collection can contain unsaved patterns. Keep its authored order and source identity.
    const matches = new Map(
      mobileCollectionSearch.results.map((entry) => [libraryEntryKey(entry), entry]),
    );
    return (collections.get(libraryEntryKey(collectionContext)) ?? []).flatMap((entry) => {
      const match = matches.get(libraryEntryKey(entry));
      return match ? [match] : [];
    });
  });
  function chooseCollection(key: string) {
    scopeChosen = true;
    selectedCollection = key;
    activeCategory = 'pattern';
  }
  $effect(() => {
    if (selectedVerse !== view.selectedVerse) selectedVerse = view.selectedVerse;
    if (mobileView && selectedCollection !== 'all' && !collectionContext)
      selectedCollection = 'all';
  });
  onMount(() => {
    if (!mobileCollections) return;
    const media = window.matchMedia('(max-width: 800px)');
    const update = () => {
      narrowScreen = media.matches;
    };
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  });
  onMount(() => {
    let initialized = false;
    const reader = createWorkspaceRefresh({
      read: async () => {
        const localWorkspace = await getLocalWorkspace();
        return Promise.all([
          localWorkspace.listEntities(),
          localWorkspace.listSavedEntries(),
          showControls ? localWorkspace.listUsefulness().catch(() => null) : Promise.resolve([]),
        ]);
      },
      apply: ([entities, saved, usefulness]) => {
        personal = entities;
        savedEntries = saved;
        ratings = usefulness ?? [];
        ratingsAvailable = usefulness !== null;
        if (!ratingsAvailable && ratingFilter !== 'any') ratingFilter = 'any';
        message = ratingsAvailable
          ? ''
          : 'Your ratings are unavailable in this browser. You can still browse the library.';
        if (!initialized && !scopeChosen) scope = myLibraryCount ? 'saved' : 'explore';
        initialized = true;
      },
      failed: () => {
        ratingsAvailable = false;
        message =
          'The local workspace is unavailable in this browser. You can still explore the catalog.';
      },
      settled: () => {
        ready = true;
      },
    });
    const refresh = () => {
      void reader.refresh();
    };
    refresh();
    const unsubscribe = subscribeWorkspaceChanges(['entities', 'saved', 'ratings'], refresh);
    window.addEventListener('focus', refresh);
    return () => {
      reader.dispose();
      unsubscribe();
      window.removeEventListener('focus', refresh);
    };
  });
  function chooseScope(next: LibraryScope) {
    scopeChosen = true;
    scope = next;
    selectedCollection = 'all';
  }
</script>

<section
  class="library"
  class:feed-library={showControls}
  class:mobile-collection-library={mobileView}
  id="library"
  aria-labelledby="library-heading"
>
  <div class="section-heading split-heading" class:visually-hidden={showControls}>
    <div>
      <p>{eyebrow}</p>
      <h2 id="library-heading">{heading}</h2>
    </div>
    <span class="source-note">
      {catalog.counts.total} entries · {catalog.counts.personal} mine · {catalog.counts.commons} commons
    </span>
  </div>

  <div class:feed-layout={showControls && visibleVerses.length > 0}>
    {#if showControls && visibleVerses.length}
      <aside class="verse-sidebar" aria-label="Browse verses">
        <h3>Verses</h3>
        <button
          class:chosen={selectedVerse === 'all'}
          aria-pressed={selectedVerse === 'all'}
          onclick={() => (selectedVerse = 'all')}>All verses</button
        >{#each visibleVerses as verse (verse.key)}<button
            class:chosen={selectedVerse === verse.key}
            aria-pressed={selectedVerse === verse.key}
            onclick={() => (selectedVerse = verse.key)}
            >{verse.title}{verse.sourceId === 'personal' ? ' · Mine' : ''}</button
          >{/each}
      </aside>
    {/if}
    <div class="feed-main">
      {#if showControls}
        <nav class="library-scopes" class:mobile-navigation={mobileView} aria-label="Library scope">
          <button
            type="button"
            disabled={!ready}
            aria-pressed={scope === 'saved'}
            class:active={scope === 'saved'}
            onclick={() => chooseScope('saved')}
            >{#if mobileView}<Bookmark size={18} aria-hidden="true" />{/if}My library
            <span>{myLibraryCount}</span></button
          >
          <button
            type="button"
            disabled={!ready}
            aria-pressed={scope === 'explore'}
            class:active={scope === 'explore'}
            onclick={() => chooseScope('explore')}
            >{#if mobileView}<Library
                size={18}
                aria-hidden="true"
              />Commons{:else}Explore{/if}</button
          >
        </nav>
        <div class="library-tools">
          <form class="library-search" role="search" onsubmit={(event) => event.preventDefault()}>
            <label for="library-search-input"
              >{scope === 'saved' ? 'Search my library' : 'Search the catalog'}</label
            >
            <div class="search-field">
              <span class="search-icon" aria-hidden="true"><Search size={18} /></span>
              <input
                id="library-search-input"
                type="search"
                placeholder={mobileView
                  ? 'Search patterns…'
                  : scope === 'saved'
                    ? 'Search your library'
                    : 'Search by title, purpose, or keyword'}
                bind:this={searchInput}
                bind:value={query}
                onkeydown={(event) => {
                  if (event.key === 'Escape' && !event.isComposing && query) {
                    event.preventDefault();
                    clearSearch();
                  }
                }}
              />
              {#if query}
                <button
                  class="search-clear"
                  type="button"
                  aria-label="Clear search"
                  onclick={clearSearch}><X size={18} aria-hidden="true" /></button
                >
              {/if}
            </div>
          </form>

          {#if mobileView}
            <button
              class="mobile-filter-toggle"
              type="button"
              aria-label="Filter library"
              aria-expanded={mobileFiltersOpen}
              aria-controls={filterPanelId}
              onclick={() => (mobileFiltersOpen = !mobileFiltersOpen)}
              ><SlidersHorizontal size={20} aria-hidden="true" /></button
            >
          {:else}
            <LibraryViewSwitch bind:layout mobileVisible />
          {/if}
        </div>
        {#if visibleVerses.length}<label class="mobile-verses"
            >Verse<select bind:value={selectedVerse}
              ><option value="all">All verses</option
              >{#each visibleVerses as verse (verse.key)}<option value={verse.key}
                  >{verse.title}{verse.sourceId === 'personal' ? ' · Mine' : ''}</option
                >{/each}</select
            ></label
          >{/if}
        <div
          id={filterPanelId}
          class:mobile-filter-panel={mobileView}
          hidden={mobileView && !mobileFiltersOpen}
        >
          <div class="library-filters">
            <nav class="library-categories" aria-label="Library categories">
              <button
                type="button"
                class:active={activeCategory === 'all'}
                aria-pressed={activeCategory === 'all'}
                onclick={() => {
                  activeCategory = 'all';
                  selectedCollection = 'all';
                }}>All</button
              >
              {#each typeOptions as option (option.value)}
                <button
                  type="button"
                  class:active={activeCategory === option.value}
                  aria-pressed={activeCategory === option.value}
                  onclick={() => {
                    activeCategory = option.value;
                    selectedCollection = 'all';
                  }}>{option.label}</button
                >
              {/each}
            </nav>
            <LibraryRatingFilterControl bind:value={ratingFilter} available={ratingsAvailable} />
          </div>
        </div>
        {#if mobileView && mobileCollectionEntries.length}
          <MobileLibraryCollections
            items={mobileCollectionEntries}
            {collections}
            selected={selectedCollection}
            allSummary={scope === 'saved' ? 'Browse your saved patterns' : 'Explore the Commons'}
            onselect={chooseCollection}
          />
        {/if}
      {/if}

      <div class="library-results-heading" aria-live="polite">
        {#if mobileView}<h3>
            {collectionContext?.title ??
              (scope === 'saved'
                ? 'My library'
                : activeCategory === 'pattern'
                  ? 'Patterns in the Commons'
                  : 'Library entries')}
          </h3>
          <span
            >{displayedResults.length} {displayedResults.length === 1 ? 'entry' : 'entries'}</span
          >{#if selectedCollection !== 'all'}<button
              class="mobile-view-all"
              type="button"
              onclick={() => chooseCollection('all')}>View all</button
            >{/if}{:else}<p>{resultLabel}</p>{/if}
        {#if query.trim()}<span>for “{query.trim()}”</span>{/if}
        {#if showControls && ratingFilter !== 'any'}<span
            >· {ratingFilter === 'useful' ? 'Useful or better' : 'Very useful only'}</span
          >{/if}
      </div>

      {#if displayedResults.length > 0}
        {#if mobileView}
          <MobileLibraryResults items={displayedResults} {collectionContext} />
        {:else if showControls}
          {#key JSON.stringify([query, scope, activeCategory, selectedVerse, ratingFilter])}
            <PaginatedEntityList
              items={visibleResults}
              {layout}
              cardsOnMobile
              label="Library results"
              {collections}
            />
          {/key}
        {:else}
          <EntityList items={visibleResults} />
        {/if}
      {:else if ready}
        <div class="library-empty">
          <div class="library-empty-content">
            <h3>{emptyLibrary ? 'Nothing saved yet' : 'No matching patterns'}</h3>
            <p>
              {emptyLibrary
                ? 'Find something useful in Explore, then use the bookmark to keep it in your library.'
                : 'Try a different word, or clear your filters to see more of your library.'}
            </p>
            <div class="library-empty-actions">
              {#if showControls && emptyLibrary}<button
                  class="library-empty-explore"
                  type="button"
                  onclick={() => chooseScope('explore')}>Explore</button
                >{/if}
              {#if hasSearchOrFilters || selectedCollection !== 'all'}<button
                  class="library-empty-clear"
                  type="button"
                  onclick={() => {
                    query = '';
                    activeCategory = initialCategory;
                    selectedVerse = 'all';
                    selectedCollection = 'all';
                    ratingFilter = 'any';
                  }}>{query.trim() ? 'Clear search' : 'Clear filters'}</button
                >{/if}
            </div>
            {#if emptyLibrary}<p class="library-empty-note">
                Your own articles will appear here too.
              </p>{/if}
          </div>
        </div>
      {/if}

      {#if viewAllHref && results.length > visibleResults.length}
        <!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
        <a class="library-view-all" href={viewAllHref}>{viewAllLabel}</a>
      {/if}

      {#if message}<p class="library-message" aria-live="polite">{message}</p>{/if}
    </div>
  </div>
</section>

<style>
  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }
  .library-scopes {
    display: flex;
    gap: 1.5rem;
    border-bottom: 1px solid #deded8;
    margin: 0 0 1.4rem;
    padding: 0;
  }
  .library-scopes button {
    background: transparent;
    border: 0;
    border-bottom: 3px solid transparent;
    min-height: 48px;
    padding: 0.6rem 0.3rem;
    font: inherit;
    font-size: 0.95rem;
    font-weight: 650;
    cursor: pointer;
    color: var(--ink);
  }
  .library-scopes button.active {
    border-bottom-color: var(--green-dark);
    color: var(--green-dark);
    font-weight: 750;
  }
  .library-scopes span {
    display: inline-block;
    background: #f0f1ee;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    margin-left: 0.3rem;
    font-size: 0.75rem;
  }
  .feed-library {
    max-width: 1280px;
    margin: auto;
    padding: 0 5vw 4rem;
  }
  .feed-library .section-heading {
    margin-bottom: 1.5rem;
    align-items: center;
    gap: 1rem;
  }
  .feed-library .section-heading h2 {
    font-size: 1.25rem;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }
  .feed-library .section-heading p {
    font-size: 0.7rem;
    margin-bottom: 0.5rem;
  }
  .feed-library .source-note {
    font-size: 0.7rem;
    color: var(--muted);
  }
  .feed-layout {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr);
    gap: 1.5rem;
  }
  .feed-main {
    min-width: 0;
    container-type: inline-size;
  }
  .verse-sidebar h3 {
    margin: 0 0 0.75rem;
    font-size: 0.75rem;
    font-weight: 750;
  }
  .verse-sidebar button {
    display: block;
    width: 100%;
    text-align: left;
    border: 0;
    background: transparent;
    color: var(--muted);
    padding: 0.75rem 0.65rem;
    font: inherit;
    font-size: 0.8rem;
    line-height: 1.4;
    cursor: pointer;
  }
  .verse-sidebar button:hover {
    color: var(--ink);
    background: #f7f7f3;
  }
  .verse-sidebar button.chosen {
    background: var(--mint);
    color: var(--ink);
    font-weight: 700;
  }
  .mobile-verses {
    display: none;
  }
  .feed-library .library-tools {
    margin: 0 0 1rem;
    padding: 0;
    border: 0;
    display: flex;
    align-items: end;
    gap: 1rem;
  }
  .feed-library .library-search {
    flex: 1;
    min-width: 0;
  }
  .feed-library .library-search label {
    font-size: 0.75rem;
    margin-bottom: 0.5rem;
  }
  .search-field {
    position: relative;
  }
  .search-icon {
    position: absolute;
    display: flex;
    align-items: center;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: var(--muted);
    pointer-events: none;
  }
  .feed-library .library-search input {
    min-width: 0;
    width: 100%;
    min-height: 48px;
    padding: 0.65rem 48px 0.65rem 42px;
    border: 1px solid #d7d7d0;
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
    font-size: 0.85rem;
  }
  .feed-library .library-search input:focus-visible {
    border-color: var(--green-dark);
    outline: 2px solid var(--green-dark);
    outline-offset: 2px;
  }
  .feed-library .library-search input::-webkit-search-cancel-button {
    display: none;
  }
  .feed-library .library-search .search-clear {
    position: absolute;
    right: 2px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 3px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
  }
  .feed-library .library-search .search-clear:hover,
  .feed-library .library-search .search-clear:focus-visible {
    background: #f3f5ef;
    color: var(--ink);
  }
  .feed-library .library-search .search-clear:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: -3px;
  }
  .feed-library .library-categories {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin: 0;
    padding: 0;
    border: 0;
  }
  .feed-library .library-categories button {
    font: inherit;
    font-size: 0.75rem;
    min-height: 36px;
    padding: 0.5rem 0.8rem;
    border: 1px solid #deded8;
    background: white;
    color: var(--muted);
  }
  .feed-library .library-categories button.active {
    background: var(--ink);
    color: white;
    border-color: var(--ink);
  }
  .feed-library .library-categories button::after {
    display: none;
  }
  .feed-library .library-results-heading {
    font-size: 0.75rem;
    margin: 0 0 1rem;
  }
  .library-filters {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-bottom: 1rem;
  }
  [hidden] {
    display: none !important;
  }
  .mobile-collection-library {
    padding-inline: 20px;
    padding-bottom: 2rem;
    background: var(--paper);
  }
  .mobile-collection-library .library-tools {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin: 0;
  }
  .mobile-collection-library .library-search > label {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .mobile-collection-library .library-search input {
    border-color: #d7d7d0;
    border-radius: 5px;
    background: var(--paper);
  }
  .mobile-filter-toggle {
    display: grid;
    place-items: center;
    flex: 0 0 44px;
    min-height: 48px;
    padding: 0;
    border: 1px solid #deded8;
    border-radius: 5px;
    color: var(--ink);
    background: var(--paper);
    cursor: pointer;
  }
  .mobile-filter-panel {
    padding: 1rem;
    margin: 1rem 0;
    border: 1px solid #deded8;
    border-radius: 5px;
    background: var(--paper);
  }
  .mobile-collection-library .mobile-verses {
    margin: 1rem 0 0;
  }
  .mobile-collection-library .library-results-heading {
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem 0.75rem;
    margin: 1.3rem 0 0;
    text-transform: lowercase;
  }
  .mobile-collection-library .library-results-heading h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 750;
    letter-spacing: -0.025em;
  }
  .mobile-collection-library .library-results-heading span {
    font-size: 0.72rem;
    color: var(--muted);
  }
  .mobile-view-all {
    margin-left: auto;
    min-height: 44px;
    padding: 0;
    border: 0;
    font: inherit;
    color: var(--green-dark);
    background: transparent;
    cursor: pointer;
  }
  .library-scopes.mobile-navigation {
    position: fixed;
    z-index: 5;
    inset: auto 0 0;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
    margin: 0;
    padding: 0.5rem 1rem calc(0.5rem + env(safe-area-inset-bottom));
    border-top: 1px solid #deded8;
    border-bottom: 0;
    background: var(--paper);
  }
  .library-scopes.mobile-navigation button {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    max-width: 240px;
    gap: 0.25rem;
    min-height: 52px;
    padding: 0.4rem;
    border: 0;
    border-radius: 5px;
    color: var(--muted);
    font-size: 0.72rem;
    font-weight: 650;
  }
  .library-scopes.mobile-navigation button:last-child {
    order: -1;
  }
  .library-scopes.mobile-navigation button.active {
    color: var(--green-dark);
    background: var(--mint);
    font-weight: 750;
  }
  .library-scopes.mobile-navigation span {
    display: none;
  }
  :global(body:has(.mobile-navigation)) {
    padding-bottom: calc(72px + env(safe-area-inset-bottom));
  }
  @media (max-width: 800px) {
    .library-filters {
      flex-direction: column;
      align-items: flex-start;
    }
  }
  @media (max-width: 800px) {
    .feed-library .library-search input {
      font-size: 1rem;
    }
    .feed-layout {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
    }
    .verse-sidebar {
      display: none;
    }
    .mobile-verses {
      display: grid;
      gap: 0.5rem;
      font-size: 0.75rem;
      font-weight: 650;
      margin-bottom: 1rem;
    }
    .mobile-verses select {
      min-width: 0;
      width: 100%;
      min-height: 44px;
      padding: 0.65rem 0.75rem;
      font: inherit;
      border: 1px solid #d7d7d0;
      background: white;
    }
    .feed-library .library-tools {
      align-items: stretch;
      flex-direction: column;
      gap: 0.5rem;
    }
    .mobile-collection-library .library-tools {
      flex-direction: row;
      align-items: center;
    }
    .feed-library .library-tools :global(.library-view-switch) {
      align-self: flex-end;
    }
    .feed-library .section-heading {
      align-items: start;
      flex-direction: column;
    }
  }
</style>

<script lang="ts">
  import { resolve } from '$app/paths';
  import { onMount, tick, type Snippet } from 'svelte';
  import { Search, X } from '@lucide/svelte';
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
  import { loadLibrarySearch } from '$lib/client/library-search';
  import type { LibrarySearchAsset } from '$lib/library-search-asset';
  import type { EntitySummary } from '$lib/server/commons';
  import EntityList from './EntityList.svelte';
  import PaginatedEntityList from './PaginatedEntityList.svelte';
  import type {
    DesktopLibrarySnapshot,
    EntryBrowseSnapshot,
  } from '$lib/client/library-browse-snapshot';
  import LibraryViewSwitch from './LibraryViewSwitch.svelte';
  import LibraryScopeSwitch from './LibraryScopeSwitch.svelte';
  import MobileLibraryCollections from './MobileLibraryCollections.svelte';
  import MobileLibraryResults from './MobileLibraryResults.svelte';
  import MobileLibrarySearch from './MobileLibrarySearch.svelte';
  import MobileLibraryVerses from './MobileLibraryVerses.svelte';
  import DesktopLibraryVerses from './DesktopLibraryVerses.svelte';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';
  import type { LibraryRatingFilter } from '$lib/client/library-ratings';
  import LibraryRatingFilterControl from './LibraryRatingFilter.svelte';
  import type { WorkspaceUsefulness } from '@patternverse/workspace';
  import { libraryCollections } from '$lib/library-collections';
  import { groupVersesByArea } from '$lib/verse-areas';
  import { collectionItemHref } from '$lib/collection-navigation';
  import {
    createWorkspaceLibraryCatalog,
    workspaceLibraryView,
    initialLibraryCategory,
    librarySummaryDocuments,
    type LibraryVerse,
    type LibraryCategory,
    type LibraryScope,
  } from '$lib/client/workspace-library-view';

  const defaultTypes: readonly BrowsableLibraryType[] = ['pattern', 'collection'];
  let {
    commons,
    commonsSearchDocuments = [],
    searchAsset,
    commonsVerses = [],
    query = $bindable(''),
    selectedVerse = $bindable('all'),
    scope = $bindable<LibraryScope>('explore'),
    initialTypes = defaultTypes,
    limit,
    eyebrow = 'From your unified library',
    heading = 'Start somewhere useful',
    showControls = true,
    mobileCollections = false,
    featuredIds = [],
    viewAllHref,
    viewAllLabel = 'View the full library →',
    intro,
  }: {
    commons: readonly EntitySummary[];
    commonsSearchDocuments?: readonly LibrarySearchDocument[];
    searchAsset?: LibrarySearchAsset;
    commonsVerses?: readonly LibraryVerse[];
    query?: string;
    selectedVerse?: string;
    scope?: LibraryScope;
    initialTypes?: readonly EntityType[];
    limit?: number;
    eyebrow?: string;
    heading?: string;
    showControls?: boolean;
    mobileCollections?: boolean;
    featuredIds?: readonly string[];
    viewAllHref?: string;
    viewAllLabel?: string;
    intro?: Snippet;
  } = $props();

  let personal = $state<readonly RawEntity[]>([]);
  let loadedSearch = $state<{
    path: string;
    documents: readonly LibrarySearchDocument[];
  }>();
  let searchState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle');
  let searchRequestPath = '';
  const searchIncomplete = $derived(
    Boolean(searchAsset && loadedSearch?.path !== searchAsset.path),
  );
  const publicSearchDocuments = $derived(
    searchAsset
      ? loadedSearch?.path === searchAsset.path
        ? loadedSearch.documents
        : librarySummaryDocuments(commons)
      : commonsSearchDocuments,
  );
  async function ensureSearch(retry = false) {
    const asset = searchAsset;
    if (!asset || loadedSearch?.path === asset.path) return;
    if (
      searchRequestPath === asset.path &&
      (searchState === 'loading' || (searchState === 'error' && !retry))
    )
      return;
    searchRequestPath = asset.path;
    searchState = 'loading';
    try {
      const documents = await loadLibrarySearch(asset);
      if (searchAsset?.path !== asset.path) return;
      loadedSearch = { path: asset.path, documents };
      searchState = 'ready';
    } catch {
      if (searchAsset?.path === asset.path) searchState = 'error';
    }
  }
  $effect(() => {
    // Includes queries restored by SvelteKit snapshots, without stealing focus.
    if (query.trim()) void ensureSearch();
  });
  let ready = $state(false);
  let message = $state('');
  let savedEntries = $state<readonly SavedLibraryEntry[]>([]);
  let ratingFilter = $state<LibraryRatingFilter>('any');
  let ratingsAvailable = $state(false);
  let ratings = $state<readonly WorkspaceUsefulness[]>([]);
  const collections = $derived(libraryCollections(commons, personal));
  type Layout = 'list' | 'cards';
  let layout = $state<Layout>('cards');
  let resultList = $state<{
    captureState: () => EntryBrowseSnapshot;
    restoreState: (snapshot: EntryBrowseSnapshot) => void;
  }>();
  let pendingRestore = $state<EntryBrowseSnapshot | null>(null);
  export function captureDesktopState(): DesktopLibrarySnapshot | null {
    if (typeof window === 'undefined' || !window.matchMedia('(min-width: 801px)').matches)
      return null;
    return {
      query,
      scope,
      category: browseCategory,
      browseCategories: { ...browseCategories },
      searchCategory,
      ratingFilter,
      layout,
      entries: resultList?.captureState() ?? null,
    };
  }
  export function restoreDesktopState(snapshot: DesktopLibrarySnapshot) {
    if (!window.matchMedia('(min-width: 801px)').matches) return;
    query = snapshot.query;
    scope = snapshot.scope;
    if (snapshot.browseCategories) browseCategories = { ...snapshot.browseCategories };
    else browseCategories[snapshot.scope] = snapshot.category;
    searchCategory = snapshot.searchCategory ?? 'all';
    ratingFilter = snapshot.ratingFilter;
    layout = snapshot.layout;
    pendingRestore = snapshot.entries;
  }
  $effect(() => {
    if (!ready || !resultList || !pendingRestore) return;
    const snapshot = pendingRestore;
    pendingRestore = null;
    void tick().then(() => resultList?.restoreState(snapshot));
  });
  let searchInput = $state<HTMLInputElement>();
  let narrowScreen = $state(false);
  const mobileView = $derived(mobileCollections && showControls && narrowScreen);
  let mobileFiltersOpen = $state(false);
  let selectedCollection = $state('all');
  const uid = $props.id();
  const filterPanelId = uid + '-filters';
  let mobileResultsAnchor: HTMLDivElement | undefined;
  let mobileNavigationIdentity = '';
  async function chooseVerse(key: string, fromPicker = false) {
    if (selectedVerse === key) return;
    selectedVerse = key;
    selectedCollection = 'all';
    await tick();
    if (fromPicker) mobileResultsAnchor?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
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
  // Search starts across entry types while keeping the user's browse category intact.
  // Commons starts with the configured category; My library starts with every saved type.
  // svelte-ignore state_referenced_locally
  let browseCategories = $state<Record<LibraryScope, LibraryCategory>>({
    explore: initialCategory,
    saved: showControls ? 'all' : initialCategory,
  });
  const browseCategory = $derived(browseCategories[scope]);
  const defaultBrowseCategory = $derived(
    scope === 'saved' && showControls ? 'all' : initialCategory,
  );
  let searchCategory = $state<LibraryCategory>('all');
  const searching = $derived(Boolean(query.trim()));
  const activeCategory = $derived(searching ? searchCategory : browseCategory);
  function chooseCategory(category: LibraryCategory) {
    if (searching) searchCategory = category;
    else browseCategories[scope] = category;
    selectedCollection = 'all';
  }
  $effect(() => {
    if (!searching) searchCategory = 'all';
  });
  // svelte-ignore state_referenced_locally
  const featuredRank = new Map(featuredIds.map((id, index) => [id, index] as const));

  const catalog = $derived(
    createWorkspaceLibraryCatalog({
      commons,
      commonsSearchDocuments: publicSearchDocuments,
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
      initialCategory: defaultBrowseCategory,
      ratingFilter,
      showControls,
      featuredRank,
      limit,
    }),
  );
  const visibleVerses = $derived(view.visibleVerses);
  $effect(() => {
    if (ready && selectedVerse !== view.selectedVerse) selectedVerse = view.selectedVerse;
  });
  const visibleVerseAreas = $derived(groupVersesByArea(visibleVerses));
  const myLibraryCount = $derived(view.myLibraryCount);
  const emptyLibrary = $derived(view.emptyLibrary);
  const hasSearchOrFilters = $derived(view.hasSearchOrFilters);
  const results = $derived(view.results);
  const visibleResults = $derived(view.visibleResults);
  const resultLabel = $derived(view.resultLabel);
  const broaderMatchKeys = $derived(view.broaderMatchKeys);
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
  const mobileCollectionSearch = $derived(
    workspaceLibraryView(catalog, {
      savedEntries,
      ratings,
      scope: 'explore',
      selectedVerse: 'all',
      query: activeCategory === 'collection' ? '' : query,
      category: 'pattern',
      initialCategory,
      ratingFilter: activeCategory === 'collection' ? 'any' : ratingFilter,
      showControls,
      featuredRank,
    }),
  );
  const mobileCollectionItems = $derived.by(() => {
    const savedKeys = savedLibraryKeys(savedEntries);
    const matches = new Map(
      mobileCollectionSearch.results.map((entry) => [libraryEntryKey(entry), entry]),
    );
    return new Map(
      mobileCollectionEntries.map((collection) => {
        const key = libraryEntryKey(collection);
        // Saving a collection keeps its full contents available; otherwise show only saved/owned members.
        const wholeCollection = scope === 'explore' || isInMyLibrary(collection, savedKeys);
        const items = (collections.get(key) ?? []).flatMap((member) => {
          // Collection browsing includes every authored member type. Direct pattern
          // searches and rating results still use their filtered matches.
          const match =
            activeCategory === 'collection' ||
            (member.type === 'collection' && !query.trim() && ratingFilter === 'any')
              ? member
              : matches.get(libraryEntryKey(member));
          return match && (wholeCollection || isInMyLibrary(match, savedKeys)) ? [match] : [];
        });
        return [key, items] as const;
      }),
    );
  });
  const mobileShownCollections = $derived(
    !searching && activeCategory === 'collection' ? visibleResults : [],
  );
  const mobileStandaloneResults = $derived.by(() => {
    if (activeCategory === 'collection') return searching ? visibleResults : [];
    if (activeCategory !== 'pattern') return visibleResults;
    if (query.trim() || ratingFilter !== 'any') {
      // Direct searches/ratings expose every match, even when its collection is collapsed.
      const matches = new Map(
        (searching
          ? visibleResults
          : [...visibleResults, ...[...mobileCollectionItems.values()].flat()]
        ).map((entry) => [libraryEntryKey(entry), entry]),
      );
      return [...matches.values()].map((entry) => {
        const context = mobileCollectionEntries.find((collection) =>
          mobileCollectionItems
            .get(libraryEntryKey(collection))
            ?.some((item) => libraryEntryKey(item) === libraryEntryKey(entry)),
        );
        return context ? { ...entry, url: collectionItemHref(entry.url, context) } : entry;
      });
    }
    return visibleResults;
  });
  const mobileResultType = $derived(
    activeCategory === 'collection'
      ? 'collection'
      : activeCategory === 'pattern'
        ? 'pattern'
        : 'entry',
  );
  const mobileHasResults = $derived(
    mobileShownCollections.length > 0 || mobileStandaloneResults.length > 0,
  );
  function chooseCollection(key: string) {
    selectedCollection = selectedCollection === key ? 'all' : key;
  }
  $effect(() => {
    if (selectedVerse !== view.selectedVerse) selectedVerse = view.selectedVerse;
    const identity = JSON.stringify([
      mobileView,
      scope,
      activeCategory,
      selectedVerse,
      query,
      ratingFilter,
    ]);
    if (identity !== mobileNavigationIdentity) {
      mobileNavigationIdentity = identity;
      if (mobileView)
        selectedCollection = mobileShownCollections[0]
          ? libraryEntryKey(mobileShownCollections[0])
          : 'all';
    }
    if (
      mobileView &&
      selectedCollection !== 'all' &&
      !mobileShownCollections.some((entry) => libraryEntryKey(entry) === selectedCollection)
    )
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
        // Loading local data must preserve the user's current or restored scope.
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
  {#if intro}
    <div class:feed-layout={showControls && !mobileCollections && visibleVerses.length > 0}>
      <div class="library-intro">{@render intro()}</div>
    </div>
  {/if}
  <div class="section-heading split-heading" class:visually-hidden={showControls}>
    <div>
      <p>{eyebrow}</p>
      <h2 id="library-heading">{heading}</h2>
    </div>
    <span class="source-note">
      {catalog.counts.total} entries · {catalog.counts.personal} mine · {catalog.counts.commons} commons
    </span>
  </div>

  <div class:feed-layout={showControls && !mobileCollections && visibleVerses.length > 0}>
    {#if showControls && !mobileCollections && visibleVerses.length}
      <aside class="verse-sidebar" aria-label="Browse verses">
        <DesktopLibraryVerses
          verses={visibleVerses}
          selected={selectedVerse}
          onselect={chooseVerse}
        />
      </aside>
    {/if}
    <div class="feed-main">
      {#if showControls}
        {#if !mobileView}
          <div class="library-scope-control">
            <LibraryScopeSwitch
              {scope}
              {ready}
              savedCount={myLibraryCount}
              onselect={chooseScope}
            />
          </div>
        {/if}
        <div class="library-tools">
          {#if mobileView}
            <MobileLibrarySearch
              bind:query
              {scope}
              {ready}
              bind:filtersOpen={mobileFiltersOpen}
              {filterPanelId}
              statusId={searchIncomplete && searchState !== 'idle'
                ? `${uid}-search-status`
                : undefined}
              onscopechange={chooseScope}
              onsearchfocus={() => void ensureSearch()}
            />
          {:else}
            <form class="library-search" role="search" onsubmit={(event) => event.preventDefault()}>
              <label for="library-search-input"
                >{scope === 'saved' ? 'Search my library' : 'Search the catalog'}</label
              >
              <div class="search-field">
                <div class="search-input-wrap">
                  <span class="search-icon" aria-hidden="true"><Search size={18} /></span>
                  <input
                    id="library-search-input"
                    type="search"
                    placeholder={scope === 'saved'
                      ? 'Search your library'
                      : 'Search by title, purpose, or keyword'}
                    bind:this={searchInput}
                    bind:value={query}
                    onfocus={() => void ensureSearch()}
                    aria-describedby={searchIncomplete && searchState !== 'idle'
                      ? `${uid}-search-status`
                      : undefined}
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
              </div>
            </form>
            {#if !searching}<LibraryViewSwitch bind:layout mobileVisible />{/if}
          {/if}
        </div>
        {#if searchIncomplete && searchState !== 'idle'}
          <p id={`${uid}-search-status`} class="library-message" role="status">
            {searchState === 'error'
              ? 'Full library search is unavailable. You can search titles, summaries, and your own content. Reconnect and retry.'
              : 'Loading full library search… Showing title and summary matches and your own content.'}
            {#if searchState === 'error'}
              <button type="button" onclick={() => void ensureSearch(true)}
                >Retry full search</button
              >
            {/if}
          </p>
        {/if}
        {#if !mobileCollections && visibleVerses.length}<label class="mobile-verses"
            >Verse<select bind:value={selectedVerse}
              ><option value="all">All verses</option
              >{#each visibleVerseAreas as group (group.area.id)}<optgroup label={group.area.title}>
                  {#each group.verses as verse (verse.key)}<option value={verse.key}
                      >{verse.title}{verse.sourceId === 'personal' ? ' · Mine' : ''}</option
                    >{/each}</optgroup
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
                onclick={() => chooseCategory('all')}>All</button
              >
              {#each typeOptions as option (option.value)}
                <button
                  type="button"
                  class:active={activeCategory === option.value}
                  aria-pressed={activeCategory === option.value}
                  onclick={() => chooseCategory(option.value)}>{option.label}</button
                >
              {/each}
            </nav>
            <LibraryRatingFilterControl bind:value={ratingFilter} available={ratingsAvailable} />
          </div>
        </div>
        {#if mobileCollections && visibleVerses.length}
          <MobileLibraryVerses
            verses={visibleVerses}
            selected={selectedVerse}
            onselect={chooseVerse}
          />
        {/if}
      {/if}

      <div bind:this={mobileResultsAnchor} class="library-results-heading" aria-live="polite">
        {#if mobileView}
          <h3>
            {searching
              ? 'Search results'
              : activeCategory === 'collection'
                ? 'Collections'
                : activeCategory === 'pattern'
                  ? 'Patterns'
                  : 'Entries'}
          </h3>
          <span>
            {#if searching && broaderMatchKeys.size}{resultLabel}{:else}{mobileShownCollections.length +
                mobileStandaloneResults.length}
              {mobileShownCollections.length + mobileStandaloneResults.length === 1
                ? mobileResultType
                : mobileResultType === 'entry'
                  ? 'entries'
                  : `${mobileResultType}s`}{/if}
          </span>
        {:else}<p>{resultLabel}</p>{/if}
        {#if query.trim()}<span>for “{query.trim()}”</span>{/if}
        {#if showControls && ratingFilter !== 'any'}<span
            >· {ratingFilter === 'useful' ? 'Useful or better' : 'Very useful only'}</span
          >{/if}
      </div>

      {#if mobileView ? mobileHasResults : visibleResults.length > 0}
        {#if mobileView}
          <div role="region" aria-label="Library results">
            <MobileLibraryCollections
              items={mobileShownCollections}
              collections={mobileCollectionItems}
              selected={selectedCollection}
              onselect={chooseCollection}
            />
            {#if mobileStandaloneResults.length}
              <MobileLibraryResults
                items={mobileStandaloneResults}
                label={activeCategory === 'all'
                  ? 'Entries'
                  : activeCategory === 'collection'
                    ? 'Collections'
                    : 'Patterns'}
                showType={searching}
                {broaderMatchKeys}
              />
            {/if}
          </div>
        {:else if showControls}
          {#key JSON.stringify([query, scope, activeCategory, selectedVerse, ratingFilter])}
            <PaginatedEntityList
              bind:this={resultList}
              items={visibleResults}
              layout={searching ? 'list' : layout}
              cardsOnMobile={!searching}
              showType={searching}
              label="Library results"
              collections={searching ? undefined : collections}
              {broaderMatchKeys}
            />
          {/key}
        {:else}
          <EntityList
            items={visibleResults.filter((entry) => !broaderMatchKeys.has(libraryEntryKey(entry)))}
          />
          {#if visibleResults.some((entry) => broaderMatchKeys.has(libraryEntryKey(entry)))}
            <h3>Broader matches</h3>
            <EntityList
              items={visibleResults.filter((entry) => broaderMatchKeys.has(libraryEntryKey(entry)))}
            />
          {/if}
        {/if}
      {:else if ready && searchIncomplete && query.trim()}
        <p class="library-message">
          No matches in the available titles, summaries, or personal content.
        </p>
      {:else if ready}
        <div class="library-empty">
          <div class="library-empty-content">
            <h3>
              {emptyLibrary
                ? 'Nothing saved yet'
                : searching && activeCategory === 'all'
                  ? 'No matching results'
                  : activeCategory === 'collection'
                    ? 'No matching collections'
                    : 'No matching patterns'}
            </h3>
            <p>
              {emptyLibrary
                ? 'Find something useful in the Commons, then use the bookmark to keep it in your library.'
                : 'Try a different word, or clear your filters to see more of your library.'}
            </p>
            <div class="library-empty-actions">
              {#if showControls && emptyLibrary}<button
                  class="library-empty-explore"
                  type="button"
                  onclick={() => chooseScope('explore')}>Browse Commons</button
                >{/if}
              {#if hasSearchOrFilters || selectedCollection !== 'all'}<button
                  class="library-empty-clear"
                  type="button"
                  onclick={() => {
                    query = '';
                    browseCategories[scope] = defaultBrowseCategory;
                    searchCategory = 'all';
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
  .library-scope-control {
    margin-bottom: 1.4rem;
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
    grid-template-columns: clamp(210px, 22vw, 252px) minmax(0, 1fr);
    gap: 1.5rem;
  }
  .library-intro {
    grid-column: -2 / -1;
    min-width: 0;
  }
  .feed-main {
    min-width: 0;
    container-type: inline-size;
  }
  .verse-sidebar {
    min-width: 0;
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
  .search-input-wrap {
    position: relative;
    flex: 1;
    min-width: 0;
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
  .mobile-collection-library .feed-main {
    container-type: normal;
  }
  .mobile-collection-library .library-tools {
    flex-direction: row;
    align-items: center;
    gap: 0.5rem;
    margin: 0.75rem 0 0;
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
    scroll-margin-top: calc(96px + env(safe-area-inset-top));
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

<script lang="ts">
  import { tick } from 'svelte';
  import { ArrowRight, Search, SlidersHorizontal, X } from '@lucide/svelte';
  import LibraryScopeSwitch from './LibraryScopeSwitch.svelte';
  import type { LibraryScope } from '$lib/client/workspace-library-view';

  let {
    query = $bindable(''),
    scope,
    ready,
    filtersOpen = $bindable(false),
    filterPanelId,
    statusId,
    onscopechange,
    onsearchfocus,
  }: {
    query?: string;
    scope: LibraryScope;
    ready: boolean;
    filtersOpen?: boolean;
    filterPanelId: string;
    statusId?: string;
    onscopechange: (scope: LibraryScope) => void;
    onsearchfocus: () => void;
  } = $props();

  const uid = $props.id();
  let open = $state(false);
  let draft = $state('');
  let textarea = $state<HTMLTextAreaElement>();
  let toggle = $state<HTMLButtonElement>();
  let previousQuery: string | undefined;
  const summary = $derived(query.replace(/\s+/g, ' ').trim());

  $effect(() => {
    if (query !== previousQuery) {
      previousQuery = query;
      draft = query;
    }
  });
  function resizeSearch() {
    if (!textarea || !open) return;
    textarea.style.height = 'auto';
    textarea.style.height = `${Math.max(90, textarea.scrollHeight + 2)}px`;
  }
  $effect(() => {
    void draft;
    if (open && textarea) resizeSearch();
  });
  async function openSearch() {
    open = true;
    filtersOpen = false;
    onsearchfocus();
    await tick();
    resizeSearch();
    textarea?.focus({ preventScroll: true });
  }
  async function closeSearch() {
    open = false;
    await tick();
    toggle?.focus({ preventScroll: true });
  }
  function applySearch() {
    query = draft.trim();
    void closeSearch();
  }
  function clearSearch() {
    query = '';
    draft = '';
    toggle?.focus({ preventScroll: true });
  }
</script>

<div class="mobile-search">
  <div class="toolbar">
    <LibraryScopeSwitch {scope} {ready} onselect={onscopechange} />
    <div class="actions">
      <button
        type="button"
        class="icon-button"
        class:active={open || Boolean(summary)}
        bind:this={toggle}
        aria-label={open ? 'Close search' : 'Open search'}
        aria-expanded={open}
        aria-controls={uid + '-form'}
        onclick={() => (open ? closeSearch() : openSearch())}
      >
        {#if open}<X size={20} aria-hidden="true" />{:else}<Search
            size={20}
            aria-hidden="true"
          />{/if}
      </button>
      <button
        type="button"
        class="icon-button"
        class:active={filtersOpen}
        aria-label="Filter library"
        aria-expanded={filtersOpen}
        aria-controls={filterPanelId}
        onclick={() => {
          filtersOpen = !filtersOpen;
          if (filtersOpen) open = false;
        }}><SlidersHorizontal size={20} aria-hidden="true" /></button
      >
    </div>
  </div>

  <form
    id={uid + '-form'}
    role="search"
    hidden={!open}
    onsubmit={(event) => {
      event.preventDefault();
      applySearch();
    }}
  >
    <label for={uid + '-query'}>{scope === 'saved' ? 'Search my library' : 'Search Commons'}</label>
    <textarea
      id={uid + '-query'}
      bind:this={textarea}
      bind:value={draft}
      rows="2"
      placeholder="Title, purpose, or keyword…"
      aria-describedby={statusId}
      onkeydown={(event) => {
        if (event.isComposing) return;
        if (event.key === 'Escape') {
          event.preventDefault();
          void closeSearch();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
          event.preventDefault();
          applySearch();
        }
      }}></textarea>
    <div class="search-footer">
      <span>Enter adds a new line</span>
      <button type="submit" class="apply-search"
        >Search<ArrowRight size={16} aria-hidden="true" /></button
      >
    </div>
  </form>

  {#if summary && !open}
    <div class="query-summary">
      <button
        type="button"
        class="edit-query"
        aria-label={`Edit search: ${summary}`}
        onclick={openSearch}
      >
        <Search size={16} aria-hidden="true" /><span>{summary}</span>
      </button>
      <button type="button" class="icon-button" aria-label="Clear search" onclick={clearSearch}
        ><X size={18} aria-hidden="true" /></button
      >
    </div>
  {/if}
</div>

<style>
  .mobile-search {
    width: 100%;
    min-width: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 48px;
  }
  .actions {
    display: flex;
    flex-shrink: 0;
    gap: 4px;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .icon-button {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 44px;
    width: 44px;
    min-height: 44px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--ink);
  }
  .icon-button.active,
  .icon-button:hover {
    background: #edf5ef;
    color: var(--green-dark);
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 2px;
  }
  [hidden] {
    display: none !important;
  }
  form {
    padding: 10px 0 14px;
  }
  form > label {
    display: block;
    margin-bottom: 8px;
    font-size: 0.8rem;
    font-weight: 650;
  }
  textarea {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-height: 90px;
    padding: 12px;
    border: 1px solid #d7d7d0;
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    font-size: 1rem;
    line-height: 1.5;
    overflow: hidden;
    resize: vertical;
  }
  textarea:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 2px;
  }
  .search-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    margin-top: 8px;
  }
  .search-footer > span {
    font-size: 0.7rem;
    color: var(--muted);
  }
  .apply-search {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 44px;
    padding: 0 14px;
    border: 0;
    border-radius: 5px;
    background: var(--green-dark);
    color: var(--paper);
    font-size: 0.8rem;
    font-weight: 650;
  }
  .query-summary {
    display: flex;
    align-items: center;
    gap: 6px;
    padding-bottom: 8px;
    border-bottom: 1px solid #deded8;
  }
  .edit-query {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--green-dark);
    text-align: left;
    font-size: 0.8rem;
  }
  .edit-query :global(svg) {
    flex: 0 0 16px;
  }
  .edit-query span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>

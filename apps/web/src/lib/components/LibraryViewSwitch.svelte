<script lang="ts">
  import { onMount } from 'svelte';
  import { List, Grid2X2 } from '@lucide/svelte';
  import {
    LIBRARY_LAYOUT_KEY,
    readLibraryPreferences,
    type LibraryPreferences,
  } from '$lib/client/library-preferences';

  let {
    layout = $bindable('cards'),
    label = 'Library view',
    mobileVisible = false,
  }: {
    layout?: LibraryPreferences['layout'];
    label?: string;
    mobileVisible?: boolean;
  } = $props();

  onMount(() => {
    layout = readLibraryPreferences().layout;
  });
  function selectLayout(next: LibraryPreferences['layout']) {
    layout = next;
    try {
      localStorage.setItem(LIBRARY_LAYOUT_KEY, next);
    } catch {
      /* Switching still works when browser storage is unavailable. */
    }
  }
</script>

<div
  class="library-view-switch"
  class:mobile-visible={mobileVisible}
  role="group"
  aria-label={label}
>
  <button
    type="button"
    class:active={layout === 'list'}
    aria-pressed={layout === 'list'}
    onclick={() => selectLayout('list')}
  >
    <List size={16} aria-hidden="true" />List
  </button>
  <button
    type="button"
    class:active={layout === 'cards'}
    aria-pressed={layout === 'cards'}
    onclick={() => selectLayout('cards')}
  >
    <Grid2X2 size={16} aria-hidden="true" />Cards
  </button>
</div>

<style>
  .library-view-switch {
    display: flex;
    flex: 0 0 auto;
    border: 1px solid #deded8;
    border-radius: 5px;
    overflow: hidden;
  }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-height: 44px;
    padding: 0.65rem 0.85rem;
    border: 0;
    background: white;
    color: var(--muted);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 650;
    cursor: pointer;
  }
  button.active {
    background: var(--ink);
    color: white;
  }
  button:hover:not(.active) {
    background: #f7f7f3;
    color: var(--ink);
  }
  button:focus-visible {
    outline-offset: -3px;
  }
  @media (max-width: 800px) {
    .library-view-switch:not(.mobile-visible) {
      display: none;
    }
  }
</style>

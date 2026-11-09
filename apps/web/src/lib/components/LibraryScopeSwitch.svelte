<script lang="ts">
  import type { LibraryScope } from '$lib/client/workspace-library-view';

  let {
    scope,
    ready,
    savedCount,
    onselect,
  }: {
    scope: LibraryScope;
    ready: boolean;
    savedCount?: number;
    onselect: (scope: LibraryScope) => void;
  } = $props();
</script>

<nav class="library-scope-switch" aria-label="Library scope">
  <button
    type="button"
    class:active={scope === 'explore'}
    aria-pressed={scope === 'explore'}
    disabled={!ready}
    onclick={() => onselect('explore')}>Commons</button
  >
  <button
    type="button"
    class:active={scope === 'saved'}
    aria-pressed={scope === 'saved'}
    disabled={!ready}
    onclick={() => onselect('saved')}
  >
    My library{#if savedCount !== undefined}<span>{savedCount}</span>{/if}
  </button>
</nav>

<style>
  .library-scope-switch {
    position: relative;
    display: inline-flex;
    min-width: 0;
    gap: 2px;
    padding: 3px;
    border-radius: 999px;
    background: #ecede7;
  }
  button {
    flex: 1;
    min-height: 44px;
    padding: 0 12px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.78rem;
    font-weight: 650;
    white-space: nowrap;
    cursor: pointer;
    transition:
      background-color 150ms ease,
      color 150ms ease,
      box-shadow 150ms ease;
  }
  button.active {
    background: var(--paper);
    color: var(--green-dark);
    box-shadow: 0 1px 3px rgb(24 24 20 / 12%);
  }
  button:hover {
    color: var(--green-dark);
  }
  button:disabled {
    cursor: default;
    opacity: 0.6;
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 2px;
  }
  span {
    margin-left: 0.35rem;
    font-size: 0.72rem;
    font-variant-numeric: tabular-nums;
  }
  @media (prefers-reduced-motion: reduce) {
    button {
      transition: none;
    }
  }
</style>

<script lang="ts">
  import { onMount } from 'svelte';
  import type { VerseArea } from '$lib/verse-areas';

  let {
    areas,
    value = $bindable('all'),
    onchange,
  }: {
    areas: readonly VerseArea[];
    value?: string;
    onchange?: (value: string) => void;
  } = $props();
  let ready = $state(false);
  onMount(() => {
    ready = true;
  });
  function choose(next: string) {
    value = next;
    onchange?.(next);
  }
</script>

<nav class="verse-area-filters" aria-label="Verse Areas">
  <button
    type="button"
    disabled={!ready}
    aria-pressed={value === 'all'}
    onclick={() => choose('all')}>All</button
  >
  {#each areas as area (area.id)}
    <button
      type="button"
      disabled={!ready}
      aria-label={area.title}
      aria-pressed={value === area.id}
      onclick={() => choose(area.id)}>{area.shortTitle}</button
    >
  {/each}
</nav>

<style>
  .verse-area-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 0 1.25rem;
    margin-bottom: 0.5rem;
  }
  button {
    min-height: 44px;
    padding: 0.55rem 0;
    border: 0;
    border-bottom: 2px solid transparent;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: 0.75rem;
    text-transform: lowercase;
    cursor: pointer;
  }
  button[aria-pressed='true'] {
    border-bottom-color: var(--ink);
    color: var(--ink);
    font-weight: 750;
  }
  button:hover {
    color: var(--ink);
  }
  button:focus-visible {
    outline: 2px solid var(--focus-color);
    outline-offset: 3px;
  }
</style>

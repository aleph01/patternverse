<script lang="ts">
  import { Check, SlidersHorizontal, ThumbsUp } from '@lucide/svelte';
  import { tick } from 'svelte';
  import type { LibraryRatingFilter } from '$lib/client/library-ratings';

  let {
    value = $bindable('any'),
    available = false,
  }: {
    value?: LibraryRatingFilter;
    available?: boolean;
  } = $props();
  const uid = $props.id();
  const choices = [
    { value: 'any', label: 'Any rating' },
    { value: 'useful', label: 'Useful or better' },
    { value: 'very', label: 'Very useful only' },
  ] as const;
  let open = $state(false);
  let control: HTMLDivElement;
  let trigger: HTMLButtonElement;
  let panel = $state<HTMLDivElement>();
  const label = $derived(
    value === 'any' ? 'Your rating' : value === 'useful' ? 'Useful +' : 'Very useful',
  );

  async function toggle() {
    open = !open;
    if (open) {
      await tick();
      panel?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    }
  }
  async function choose(next: LibraryRatingFilter) {
    value = next;
    open = false;
    await tick();
    trigger.focus({ preventScroll: true });
  }
</script>

<svelte:window
  onpointerdown={(event) => {
    if (event.target instanceof Node && !control.contains(event.target)) open = false;
  }}
  onkeydown={(event) => {
    if (event.key === 'Escape' && open) {
      open = false;
      trigger.focus({ preventScroll: true });
    }
  }}
/>

<div
  class="rating-filter"
  bind:this={control}
  onfocusout={(event) => {
    if (event.relatedTarget instanceof Node && !control.contains(event.relatedTarget)) open = false;
  }}
>
  <button
    class="rating-trigger"
    class:active={value !== 'any'}
    bind:this={trigger}
    type="button"
    aria-label={`Your rating: ${value === 'any' ? 'Any rating' : value === 'useful' ? 'Useful or better' : 'Very useful only'}`}
    aria-expanded={open}
    aria-controls={open ? `${uid}-choices` : undefined}
    disabled={!available && value === 'any'}
    onclick={toggle}
  >
    <ThumbsUp size={16} aria-hidden="true" />{label}<SlidersHorizontal
      size={15}
      aria-hidden="true"
    />
  </button>
  {#if open}
    <div
      class="rating-options"
      id={`${uid}-choices`}
      bind:this={panel}
      role="group"
      aria-label="Your rating"
    >
      <p>Your ratings · private</p>
      {#each choices as choice (choice.value)}
        <button
          type="button"
          aria-pressed={value === choice.value}
          disabled={!available && choice.value !== 'any'}
          onclick={() => choose(choice.value)}
        >
          {choice.label}{#if value === choice.value}<Check size={16} aria-hidden="true" />{/if}
        </button>
      {/each}
      <small>Useful or better includes very useful.</small>
    </div>
  {/if}
</div>

<style>
  .rating-filter {
    position: relative;
    flex: 0 0 auto;
    z-index: 3;
  }
  button {
    font: inherit;
    cursor: pointer;
  }
  .rating-trigger {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.6rem 0.8rem;
    border: 1px solid #deded8;
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
    font-size: 0.75rem;
    font-weight: 650;
  }
  .rating-trigger.active {
    background: var(--mint);
    color: var(--green-dark);
    border-color: var(--green-dark);
  }
  .rating-trigger:hover:not(:disabled) {
    border-color: var(--green-dark);
  }
  button:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
  .rating-options {
    position: absolute;
    right: 0;
    top: calc(100% + 8px);
    width: 260px;
    max-width: calc(100vw - 2rem);
    padding: 0.6rem;
    border: 1px solid #deded8;
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
    box-shadow: 0 4px 16px #0000000d;
  }
  .rating-options p {
    margin: 0.2rem 0.5rem 0.4rem;
    font-size: 0.7rem;
    color: var(--muted);
  }
  .rating-options button {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    min-height: 44px;
    border: 0;
    border-radius: 3px;
    padding: 0.6rem 0.5rem;
    text-align: left;
    font-size: 0.8rem;
    color: var(--ink);
    background: transparent;
  }
  .rating-options button:hover:not(:disabled) {
    background: #f0f1ee;
  }
  .rating-options button[aria-pressed='true'] {
    background: var(--mint);
    color: var(--green-dark);
    font-weight: 650;
  }
  .rating-options small {
    display: block;
    margin: 0.6rem 0.5rem 0.2rem;
    font-size: 0.7rem;
    color: var(--muted);
    line-height: 1.5;
  }
  @media (max-width: 800px) {
    .rating-options {
      left: 0;
      right: auto;
    }
  }
</style>

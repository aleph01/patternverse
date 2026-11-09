<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import { ArrowUpRight, X } from '@lucide/svelte';
  import type { EntitySummary } from '$lib/server/commons';
  import PaginatedEntityList from './PaginatedEntityList.svelte';

  let { items, title }: { items: readonly EntitySummary[]; title: string } = $props();
  const id = $props.id();
  let open = $state(false);
  let ready = $state(false);
  let dialog = $state<HTMLDialogElement>();
  let trigger: HTMLButtonElement;
  let pressedBackdrop = false;

  onMount(() => {
    ready = true;
  });

  $effect(() => {
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  });
  $effect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  });
  onDestroy(() => dialog?.close());

  function outside(event: PointerEvent) {
    if (!dialog || event.target !== dialog) return false;
    const bounds = dialog.getBoundingClientRect();
    return (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    );
  }
</script>

<header class="compact-relationship-heading">
  <h2 id="backlinks-heading">
    <button
      bind:this={trigger}
      type="button"
      class="backlinks-trigger"
      disabled={!ready}
      aria-haspopup="dialog"
      aria-controls={`${id}-dialog`}
      onclick={() => (open = true)}
    >
      <span class="trigger-title">
        <span class="compact-meta-index" aria-hidden="true"></span>
        Linked by
      </span>
      <span class="trigger-end">
        <span class="count">{items.length}</span>
        <ArrowUpRight size={16} aria-hidden="true" />
      </span>
    </button>
  </h2>
</header>

<dialog
  bind:this={dialog}
  id={`${id}-dialog`}
  aria-labelledby={`${id}-title`}
  aria-describedby={`${id}-description`}
  onclose={() => {
    open = false;
    trigger?.focus({ preventScroll: true });
  }}
  onpointerdown={(event) => {
    pressedBackdrop = outside(event);
  }}
  onpointerup={(event) => {
    if (pressedBackdrop && outside(event)) dialog?.close();
    pressedBackdrop = false;
  }}
>
  {#if open}
    <div class="panel-shell">
      <header class="panel-heading">
        <div>
          <h2 id={`${id}-title`}>Linked by <span>{items.length}</span></h2>
          <p id={`${id}-description`}>Entries linking to “{title}”.</p>
        </div>
        <button
          type="button"
          class="panel-close"
          aria-label="Close linked by"
          onclick={() => dialog?.close()}><X size={20} aria-hidden="true" /></button
        >
      </header>
      <div class="panel-body">
        <PaginatedEntityList {items} compact label="Linking entries" />
      </div>
    </div>
  {/if}
</dialog>

<style>
  .compact-relationship-heading {
    padding: 0;
  }
  .compact-relationship-heading h2 {
    width: 100%;
  }
  .backlinks-trigger {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    min-height: 3.4rem;
    padding: 0.75rem 1.25rem;
    border: 0;
    color: inherit;
    background: transparent;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
  }
  .backlinks-trigger:hover {
    background: var(--entry-hover-background);
  }
  .trigger-title,
  .trigger-end {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .count {
    display: grid;
    place-items: center;
    min-width: 1.5rem;
    min-height: 1.5rem;
    padding-inline: 0.25rem;
    background: var(--mint);
    font-size: 0.7rem;
    font-weight: 850;
  }
  dialog {
    width: min(650px, calc(100vw - 2rem));
    max-width: none;
    max-height: calc(100dvh - 2rem);
    margin: auto;
    padding: 0;
    overflow: hidden;
    border: 1px solid var(--ink);
    border-radius: 8px;
    color: var(--ink);
    background: var(--paper);
    box-shadow: 0 14px 45px rgb(24 24 20 / 16%);
  }
  dialog::backdrop {
    background: rgb(24 24 20 / 27%);
  }
  .panel-shell {
    display: flex;
    flex-direction: column;
    max-height: calc(100dvh - 2rem - 2px);
  }
  .panel-heading {
    display: flex;
    flex: none;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.25rem;
    border-bottom: 1px solid var(--ink);
  }
  .panel-heading h2 {
    margin: 0;
    font-size: 1.5rem;
    line-height: 1.3;
    letter-spacing: -0.03em;
  }
  .panel-heading h2 span {
    color: var(--muted);
    font-size: 0.875rem;
    letter-spacing: normal;
  }
  .panel-heading p {
    margin: 0.5rem 0 0;
    color: var(--muted);
    font-size: 0.875rem;
    line-height: 1.5;
    overflow-wrap: anywhere;
  }
  .panel-close {
    display: grid;
    flex: none;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 4px;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }
  .panel-close:hover {
    background: var(--entry-hover-background);
  }
  .panel-body {
    min-height: 0;
    padding: 0 0 1.25rem;
    overflow-y: auto;
    overscroll-behavior: contain;
  }
  .panel-body :global(.pagination-footer) {
    padding-inline: 1.25rem;
  }
  .backlinks-trigger:focus-visible,
  .panel-close:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: -3px;
  }
</style>

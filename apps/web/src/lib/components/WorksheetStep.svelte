<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Check, ChevronDown, Pencil } from '@lucide/svelte';

  let {
    number,
    heading,
    completed = false,
    editing = false,
    reviewSuggested = false,
    collapsed = false,
    summary = '',
    onToggle,
    id,
    children,
    onEdit,
    editDisabled = false,
  }: {
    number: number;
    heading: string;
    completed?: boolean;
    editing?: boolean;
    reviewSuggested?: boolean;
    collapsed?: boolean;
    summary?: string;
    onToggle?: () => void;
    id: string;
    children: Snippet;
    onEdit?: () => void;
    editDisabled?: boolean;
  } = $props();
  const folded = $derived(completed && collapsed && !editing);
</script>

<section
  class="worksheet-step"
  class:completed
  class:current={!completed || editing}
  class:collapsed={folded}
  {id}
  aria-labelledby={`${id}-heading`}
>
  <div class="worksheet-step-heading">
    <span class="worksheet-marker" aria-hidden="true">
      {#if completed && !editing}<Check size={14} />{:else}{String(number).padStart(2, '0')}{/if}
    </span>
    <div class="worksheet-step-title">
      <h2 id={`${id}-heading`} tabindex="-1">{heading}</h2>
      <p class="worksheet-label">
        Step {number} · {editing
          ? 'editing'
          : reviewSuggested
            ? 'review suggested'
            : completed
              ? 'completed'
              : "You're here"}
      </p>
    </div>
    {#if completed && !editing}
      <div class="worksheet-step-controls">
        {#if onEdit}<button
            class="edit-step"
            type="button"
            disabled={editDisabled}
            aria-label={`Edit step ${number}: ${heading}`}
            onclick={onEdit}><Pencil size={13} aria-hidden="true" /><span>Edit</span></button
          >{/if}
        {#if onToggle}<button
            class="fold-step"
            type="button"
            aria-label={`${folded ? 'Expand' : 'Collapse'} step ${number}: ${heading}`}
            aria-expanded={!folded}
            aria-controls={`${id}-content`}
            onclick={onToggle}><ChevronDown size={16} aria-hidden="true" /></button
          >{/if}
      </div>
    {/if}
  </div>
  {#if folded && summary}<p class="worksheet-step-summary">{summary}</p>{/if}
  <div class="worksheet-step-content" id={`${id}-content`} hidden={folded}>
    {@render children()}
  </div>
</section>

<style>
  .worksheet-step {
    position: relative;
    min-width: 0;
    margin: 0;
    padding: 1.75rem 0;
    border-top: 1px solid var(--notebook-line);
    overflow-wrap: anywhere;
    scroll-margin-top: calc(var(--practice-timer-space, 0px) + 1.5rem);
  }
  .worksheet-step-heading {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }
  .worksheet-marker {
    flex-shrink: 0;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    margin-top: 1px;
    border-radius: 50%;
    background: var(--mint);
    color: var(--green-dark);
    font-size: 0.6875rem;
    font-weight: 600;
  }
  .current .worksheet-marker {
    background: var(--green);
    color: var(--ink);
  }
  .worksheet-step-title {
    flex: 1;
    min-width: 0;
  }
  h2 {
    margin: 0;
    color: var(--ink);
    font-size: 1.0625rem;
    font-weight: 700;
    line-height: 1.35;
    letter-spacing: -0.025em;
    white-space: pre-line;
  }
  h2:focus {
    outline: 2px solid var(--focus-color);
    outline-offset: 4px;
  }
  h2:focus:not(:focus-visible) {
    outline: none;
  }
  .current h2 {
    font-size: 1.375rem;
  }
  .worksheet-label {
    margin: 0.375rem 0 0;
    color: var(--muted);
    font-size: 0.75rem;
    line-height: 1.5;
  }
  .worksheet-step-controls {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    gap: 0.25rem;
    margin-top: -7px;
  }
  .worksheet-step-controls button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.375rem;
    min-width: 44px;
    min-height: 44px;
    padding: 0.375rem;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--green-dark);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }
  .worksheet-step-controls button:hover:not(:disabled) {
    background: var(--mint);
  }
  .worksheet-step-controls button:focus-visible {
    outline: var(--focus-width) solid var(--focus-color);
    outline-offset: 3px;
  }
  .worksheet-step-controls button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .fold-step[aria-expanded='true'] :global(svg) {
    transform: rotate(180deg);
  }
  .worksheet-step-content {
    margin: 1.25rem 0 0 40px;
  }
  .worksheet-step-summary {
    margin: 0.75rem 0 0 40px;
    color: var(--muted);
    font-size: 0.8125rem;
    line-height: 1.6;
    white-space: pre-wrap;
  }
  @media (max-width: 680px) {
    .worksheet-step {
      padding: 1.5rem 0;
      scroll-margin-top: calc(var(--practice-timer-space, 0px) + 1rem);
    }
    .worksheet-step-content {
      margin-left: 0;
    }
    .worksheet-step-heading {
      flex-wrap: wrap;
      gap: 0.625rem;
    }
    .worksheet-step-controls {
      margin: 0 0 0 38px;
      flex-basis: calc(100% - 38px);
      justify-content: flex-end;
    }
    .worksheet-step-summary {
      margin-left: 0;
    }
    .current h2 {
      font-size: 1.25rem;
    }
  }
</style>

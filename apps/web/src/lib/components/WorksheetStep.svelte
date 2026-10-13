<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    number,
    heading,
    completed = false,
    editing = false,
    reviewSuggested = false,
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
    id: string;
    children: Snippet;
    onEdit?: () => void;
    editDisabled?: boolean;
  } = $props();
</script>

<!-- The heading button provides keyboard access; clicking non-control content also opens the step. -->
<!-- svelte-ignore a11y_no_noninteractive_element_interactions, a11y_click_events_have_key_events -->
<section
  class:editable={Boolean(onEdit) && !editDisabled}
  onclick={(event) => {
    if (
      onEdit &&
      !editDisabled &&
      event.target instanceof Element &&
      !event.target.closest('button, a, input, textarea, select')
    )
      onEdit();
  }}
  class="worksheet-step"
  class:completed
  class:current={!completed || editing}
  {id}
  aria-labelledby={`${id}-heading`}
>
  <span class="worksheet-marker" aria-hidden="true"
    >{completed && !editing ? '✓' : String(number).padStart(2, '0')}</span
  >
  <p class="worksheet-label">
    {String(number).padStart(2, '0')} · {editing
      ? 'editing'
      : reviewSuggested
        ? 'review suggested'
        : completed
          ? 'completed'
          : 'current step'}
  </p>
  <h2 id={`${id}-heading`} tabindex="-1">
    {#if onEdit && !editing}<button
        class="edit-step"
        type="button"
        disabled={editDisabled}
        aria-label={`Edit step ${number}: ${heading}`}
        onclick={onEdit}
        ><span>{heading}</span><span class="edit-hint" aria-hidden="true">Edit ↗</span></button
      >
    {:else}{heading}{/if}
  </h2>
  {@render children()}
</section>

<style>
  .editable {
    cursor: pointer;
  }
  .editable:hover {
    background: #f4f6f2;
  }
  .edit-step {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    width: 100%;
    padding: 0;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: left;
    cursor: pointer;
  }
  .edit-step:focus-visible {
    outline: 2px solid #00865c;
    outline-offset: 4px;
  }
  .edit-step:disabled {
    cursor: default;
  }
  .edit-hint {
    flex-shrink: 0;
    white-space: nowrap;
    color: #00865c;
    font-size: 0.75rem;
    font-weight: 400;
    letter-spacing: 0;
  }
  .worksheet-step {
    position: relative;
    min-width: 0;
    margin: 0 0 1.75rem;
    padding: 0 0 1.75rem;
    border-bottom: 1px solid #deded9;
    overflow-wrap: anywhere;
    scroll-margin-top: calc(var(--practice-timer-space, 0px) + 1.5rem);
  }
  .worksheet-step::before {
    position: absolute;
    content: '';
    left: -2.5rem;
    top: 1rem;
    bottom: -2.75rem;
    width: 1px;
    background: #d3d8d3;
  }
  .worksheet-step:last-child::before {
    bottom: 0;
  }
  .worksheet-marker {
    position: absolute;
    left: -3.5rem;
    top: 0;
    z-index: 1;
    display: grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    background: #00865c;
    color: white;
    font-size: 0.8125rem;
    font-weight: 700;
  }
  .worksheet-label {
    margin: 0 0 0.5rem;
    color: #00865c;
    font-size: 0.75rem;
    font-weight: 750;
    line-height: 1.5;
    letter-spacing: 0.035em;
    text-transform: uppercase;
  }
  h2 {
    margin: 0 0 1rem;
    color: #181814;
    font-size: 1.375rem;
    font-weight: 750;
    line-height: 1.3;
    letter-spacing: -0.025em;
    white-space: pre-line;
  }
  h2:focus {
    outline: none;
  }
  .current {
    padding: 1.25rem;
    border: 1px solid #00865c;
    border-radius: 6px;
    background: #e7f6ed;
  }
  .current h2 {
    font-size: 1.625rem;
  }
  .current .worksheet-marker {
    background: #181814;
  }
  .current::before {
    left: calc(-2.5rem - 1px);
  }
  .current .worksheet-marker {
    left: calc(-3.5rem - 1px);
  }
  @media (max-width: 680px) {
    .worksheet-marker,
    .worksheet-step::before {
      display: none;
    }
    .worksheet-step {
      scroll-margin-top: calc(var(--practice-timer-space, 0px) + 1rem);
    }
    .current {
      padding: 0.875rem;
    }
    h2 {
      font-size: 1.25rem;
    }
    .current h2 {
      font-size: 1.375rem;
    }
  }
</style>

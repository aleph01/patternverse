<script lang="ts">
  import type { SuggestedAnswer, SuggestionSource } from './suggestions';
  let {
    suggestion,
    sources,
    answer,
    applied,
    disabled,
    onedit,
    onuse,
    ondismiss,
    onundo,
  }: {
    suggestion?: SuggestedAnswer;
    sources: readonly SuggestionSource[];
    answer: string;
    applied?: string;
    disabled: boolean;
    onedit: (text: string) => void;
    onuse: () => void;
    ondismiss: () => void;
    onundo: () => void;
  } = $props();
</script>

{#if suggestion && !answer.trim()}
  <div class="suggestion">
    <div class="draft-heading">
      <span>Suggested answer</span><button type="button" {disabled} onclick={ondismiss}
        >Dismiss</button
      >
    </div>
    <textarea
      aria-label="Edit suggested answer"
      value={suggestion.text}
      rows="3"
      maxlength="8000"
      {disabled}
      oninput={(event) => onedit(event.currentTarget.value)}></textarea>
    <div class="draft-footer">
      <details>
        <summary
          >From {suggestion.sourceIds
            .map((id) => sources.find((source) => source.id === id)?.number)
            .join(', ')}</summary
        >
        {#each sources.filter( (source) => suggestion?.sourceIds.includes(source.id) ) as source (source.id)}<p
          >
            <span>Cell {source.number}</span>{source.text}
          </p>{/each}
      </details>
      <button
        class="use"
        type="button"
        disabled={disabled || !suggestion.text.trim()}
        onclick={onuse}>Use answer</button
      >
    </div>
  </div>
{:else if applied !== undefined && answer === applied}
  <div class="added">
    Added from notes · <button type="button" {disabled} onclick={onundo}>Undo</button>
  </div>
{/if}

<style>
  .suggestion {
    margin: 0.6rem 0;
    padding: 0.85rem;
    border-radius: 8px;
    background: #eef0ef;
    color: var(--bearings-ink);
  }
  .draft-heading,
  .draft-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    font-size: 0.72rem;
    color: var(--bearings-muted);
  }
  textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 0.65rem 0;
    margin: 0.2rem 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    line-height: 1.65;
    resize: vertical;
  }
  textarea:focus-visible {
    outline: 1px solid var(--bearings-accent);
    outline-offset: 3px;
    border-radius: 3px;
  }
  button {
    min-height: 32px;
    border: 0;
    padding: 0.2rem 0.35rem;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .use {
    color: var(--bearings-accent);
    font-weight: 600;
    white-space: nowrap;
  }
  details {
    min-width: 0;
  }
  summary {
    cursor: pointer;
  }
  details p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    line-height: 1.5;
    max-height: 12rem;
    overflow: auto;
  }
  details p span {
    display: block;
    font-weight: 600;
    margin-bottom: 0.25rem;
  }
  .added {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--bearings-muted);
    font-size: 0.72rem;
    margin-top: 0.35rem;
  }
  .added button {
    color: var(--bearings-accent);
  }
  @media (pointer: coarse) {
    button,
    summary {
      min-height: 44px;
    }
    summary {
      display: flex;
      align-items: center;
    }
  }
</style>

<script lang="ts">
  import {
    Check,
    UnfoldVertical,
    FoldVertical,
    Signpost,
    CircleAlert,
    Quote,
    Image,
    TextSearch,
    Footprints,
  } from '@lucide/svelte';
  import {
    articleFeedbackCategories,
    type ArticleFeedback,
    type ArticleFeedbackCategory,
  } from '$lib/contributions/model';
  let {
    value,
    onchange,
    disabled = false,
  }: {
    value: ArticleFeedback;
    onchange: (value: ArticleFeedback) => void;
    disabled?: boolean;
  } = $props();
  const icons = [
    UnfoldVertical,
    FoldVertical,
    Signpost,
    CircleAlert,
    Quote,
    Image,
    TextSearch,
    Footprints,
  ];
  function toggle(id: ArticleFeedbackCategory) {
    const selected = value.categories.includes(id);
    const opposite = id === 'too-short' ? 'too-long' : id === 'too-long' ? 'too-short' : null;
    onchange({
      ...value,
      categories: selected
        ? value.categories.filter((category) => category !== id)
        : [...value.categories.filter((category) => category !== opposite), id],
    });
  }
</script>

<fieldset {disabled} class="quick-feedback-fields">
  <legend>What could improve this article?</legend>
  <p class="instruction">Choose any that apply. A quick selection is enough.</p>
  <div class="feedback-grid" role="group" aria-label="Feedback categories">
    {#each articleFeedbackCategories as category, i (category.id)}
      {@const Icon = icons[i]!}
      <button
        type="button"
        class="feedback-category"
        aria-pressed={value.categories.includes(category.id)}
        onclick={() => toggle(category.id)}
      >
        <Icon size={17} strokeWidth={1.6} aria-hidden="true" />
        <span><strong>{category.label}</strong><small>{category.description}</small></span>
        {#if value.categories.includes(category.id)}<Check
            class="selected-check"
            size={14}
            aria-hidden="true"
          />{/if}
      </button>
    {/each}
  </div>
  <label for="feedback-context">Anything you’d like to add? <small>optional</small></label>
  {#if value.categories.includes('error')}<p class="error-hint" id="feedback-error-hint">
      Which statement seems incorrect? A correction or source would help.
    </p>{/if}
  <textarea
    id="feedback-context"
    rows="3"
    maxlength="3000"
    value={value.context}
    oninput={(event) => onchange({ ...value, context: event.currentTarget.value })}
    aria-describedby={value.categories.includes('error') ? 'feedback-error-hint' : undefined}
    placeholder={value.categories.includes('error')
      ? 'Which statement seems incorrect, and what should it say?'
      : 'Tell us which part you mean, or what would help…'}></textarea>
</fieldset>

<style>
  .quick-feedback-fields {
    min-width: 0;
    margin: 0;
    padding: 0;
    border: 0;
  }
  legend {
    padding: 0;
    font: 800 1.25rem/1.3 var(--font-sans);
    letter-spacing: -0.035em;
    text-transform: lowercase;
  }
  .instruction {
    margin: 0.5rem 0 1.25rem;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .feedback-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    margin-bottom: 1.4rem;
    border: 1px solid var(--ink);
  }
  .feedback-category {
    position: relative;
    display: flex;
    align-items: flex-start;
    gap: 0.65rem;
    min-width: 0;
    min-height: 77px;
    padding: 0.95rem 1.8rem 0.9rem 0.95rem;
    border: 0;
    border-radius: 0;
    background: var(--paper);
    color: var(--ink);
    text-align: left;
    cursor: pointer;
  }
  .feedback-category:nth-child(even) {
    border-left: 1px solid var(--ink);
  }
  .feedback-category:nth-child(n + 3) {
    border-top: 1px solid var(--ink);
  }
  .feedback-category:hover:not(:disabled):not([aria-pressed='true']) {
    background: var(--mint);
  }
  .feedback-category[aria-pressed='true'] {
    background: var(--green);
  }
  .feedback-category:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }
  .feedback-category :global(svg) {
    flex-shrink: 0;
    margin-top: 2px;
  }
  .feedback-category :global(.selected-check) {
    position: absolute;
    right: 10px;
    top: 14px;
  }
  strong {
    display: block;
    font: 800 0.8rem/1.3 var(--font-sans);
    letter-spacing: -0.02em;
    text-transform: lowercase;
  }
  .feedback-category small {
    display: block;
    margin-top: 5px;
    color: var(--muted);
    font-size: 0.7rem;
    line-height: 1.4;
  }
  .feedback-category[aria-pressed='true'] small {
    color: var(--ink);
  }
  label {
    display: block;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
    font-weight: 750;
  }
  label small {
    margin-left: 0.25rem;
    color: var(--muted);
    font-size: 0.7rem;
    font-weight: 400;
  }
  textarea {
    display: block;
    width: 100%;
    min-height: 88px;
    padding: 0.7rem 0.75rem;
    border: 1px solid #d5d5d1;
    border-radius: 6px;
    color: var(--ink);
    background: var(--paper);
    font: 400 0.8rem/1.6 var(--font-sans);
    resize: vertical;
  }
  .error-hint {
    margin: -0.1rem 0 0.5rem;
    color: var(--muted);
    font-size: 0.75rem;
  }
  @media (max-width: 520px) {
    .feedback-category {
      display: block;
      min-height: 100px;
      padding: 0.75rem 1.4rem 0.75rem 0.65rem;
    }
    .feedback-category :global(svg) {
      margin-bottom: 6px;
    }
    strong {
      font-size: 0.75rem;
    }
    textarea {
      font-size: 16px;
    }
  }
</style>

<script lang="ts">
  /* eslint-disable svelte/no-navigation-without-resolve -- Resolved routes are supplied by the host. */
  import { X, BookOpen, ArrowUpRight } from '@lucide/svelte';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import type { MiraPatternSummary } from './context';
  import type { MiraArticleReference } from './article-reference';
  let {
    pattern,
    reference,
    error = '',
    returnHref,
    practiceHref,
    onremove,
    onretry,
  } = $props<{
    pattern: MiraPatternSummary;
    reference?: MiraArticleReference;
    error?: string;
    returnHref: string;
    practiceHref?: string;
    onremove: () => void;
    onretry: () => void;
  }>();
</script>

<section class="selected-pattern" aria-label="Selected pattern">
  <div class="pattern-heading">
    <div>
      <span class="eyebrow">Selected pattern</span>
      <h2>{pattern.title}</h2>
    </div>
    <button type="button" onclick={onremove} aria-label="Remove selected library pattern"
      ><X size={17} /></button
    >
  </div>
  {#if pattern.summary}<p class="pattern-summary">{pattern.summary}</p>{/if}
  <details>
    <summary><BookOpen size={15} />Read article</summary>
    <div class="reference-article">
      {#if reference}<MarkdownRenderer html={reference.html} />
      {:else if error}<p role="alert">{error}</p>
        <button type="button" onclick={onretry}>Try loading again</button>
      {:else}<p role="status">Loading the selected article…</p>{/if}
    </div>
  </details>
  <div class="pattern-links">
    <a href={returnHref}>Back to pattern <ArrowUpRight size={14} /></a>
    {#if practiceHref}<a href={practiceHref}>Try yourself <ArrowUpRight size={14} /></a>{/if}
  </div>
</section>

<style>
  .selected-pattern {
    flex-shrink: 0;
    min-width: 0;
    width: min(calc(100% - 2rem), 720px);
    padding: 1rem 1.1rem;
    margin: 0.25rem auto 1rem;
    background: #eff7f2;
    border: 1px solid #dce8df;
    border-radius: 10px;
  }
  .pattern-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
  }
  .eyebrow {
    font-size: 0.68rem;
    font-weight: 600;
    color: #647268;
  }
  .selected-pattern h2 {
    margin: 0.2rem 0 0;
    font-size: 1rem;
    line-height: 1.4;
    letter-spacing: -0.015em;
  }
  .pattern-heading button {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 44px;
    height: 44px;
    margin: -0.5rem -0.5rem 0 0;
    border: 0;
    color: #526357;
    background: transparent;
    border-radius: 6px;
  }
  .pattern-summary {
    margin: 0.4rem 0 0.6rem;
    font-size: 0.82rem;
    line-height: 1.6;
    color: #58675c;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    cursor: pointer;
    min-height: 44px;
    font-size: 0.8rem;
    font-weight: 600;
    list-style: none;
  }
  summary::after {
    content: '+';
    margin-left: auto;
  }
  details[open] summary::after {
    content: '−';
  }
  .reference-article {
    max-height: min(38vh, 360px);
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.7rem 0.65rem 0.7rem 0;
    border-top: 1px solid #dce8df;
    font-size: 0.85rem;
  }
  .reference-article :global(.markdown-body h2),
  .reference-article :global(.markdown-body h3) {
    font-size: 1rem;
  }
  .pattern-links {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
  }
  .pattern-links a {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    min-height: 36px;
    font-size: 0.75rem;
    color: #45634e;
  }
  button:hover,
  summary:hover,
  a:hover {
    color: #007349;
  }
  button:focus-visible,
  summary:focus-visible,
  a:focus-visible {
    outline: 2px solid #008958;
    outline-offset: 2px;
  }
  @media (max-width: 640px) {
    .selected-pattern {
      padding: 0.75rem 0.85rem;
      margin-bottom: 0.5rem;
    }
    .reference-article {
      max-height: 25dvh;
    }
    .selected-pattern:has(details[open]) + :global(.mira-messages) :global(.mira-chat-welcome) {
      display: none;
    }
    .pattern-links a {
      min-height: 44px;
    }
  }
</style>

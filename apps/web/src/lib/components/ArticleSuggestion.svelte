<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import type { RawEntity } from '@patternverse/workspace';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import type { ArticleContribution } from '../../../../article-contributions/src/contract.js';
  import {
    articleSuggestion,
    suggestibleArticles,
    readSuggestionDraft,
    saveSuggestionDraft,
    suggestionDraftKey,
    validSuggestion,
  } from '$lib/contributions/article-suggestion';

  let articles = $state<RawEntity[]>([]);
  let loading = $state(true);
  let loadError = $state('');
  let selected = $state('');
  let draft = $state<ArticleContribution | null>(null);
  let reason = $state('');
  let name = $state('');
  let email = $state('');
  let website = $state('');
  let permission = $state(false);
  let available = $state(false);
  let checking = $state(true);
  let sending = $state(false);
  let preparing = $state(false);
  let error = $state('');
  let storageError = $state('');
  let receipt = $state('');

  onMount(() => {
    let active = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    let saved: ArticleContribution | null = null;
    try {
      saved = readSuggestionDraft(localStorage);
    } catch {
      /* Local storage may be blocked. */
    }
    if (saved) {
      draft = saved;
      reason = saved.suggestion!.reason;
    }
    void getLocalWorkspace()
      .then((workspace) => workspace.listEntities())
      .then((entities) => {
        if (active) articles = suggestibleArticles(entities);
      })
      .catch(() => {
        if (active)
          loadError = 'Your personal articles could not be loaded. Reload this page to try again.';
      })
      .finally(() => {
        if (active) loading = false;
      });
    void fetch('/api/article-contributions/status', {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(async (response) => {
        const status = response.ok ? await response.json() : null;
        if (active) available = status?.available === true;
      })
      .catch(() => {
        if (active) available = false;
      })
      .finally(() => {
        window.clearTimeout(timeout);
        if (active) checking = false;
      });
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timeout);
    };
  });

  function persist() {
    if (!draft?.suggestion) return;
    draft.suggestion.reason = reason;
    try {
      saveSuggestionDraft(localStorage, draft);
      storageError = '';
    } catch {
      storageError =
        'This browser could not save the suggestion draft. Keep this page open to retry.';
    }
  }
  async function chooseArticle() {
    const article = articles.find((item) => item.id === selected);
    draft = null;
    permission = false;
    error = '';
    receipt = '';
    reason = '';
    storageError = '';
    try {
      localStorage.removeItem(suggestionDraftKey);
    } catch {
      /* Keep the current selection usable. */
    }
    if (!article) return;
    preparing = true;
    try {
      const snapshot = await articleSuggestion(article);
      if (!validSuggestion(snapshot)) {
        error =
          'This article is too large to suggest here. Choose an article with up to 60,000 characters and a shorter summary or attribution.';
        return;
      }
      draft = snapshot;
      persist();
    } catch {
      error = 'The article copy could not be prepared. Please choose it again.';
    } finally {
      preparing = false;
    }
  }
  async function submit(event: SubmitEvent) {
    event.preventDefault();
    if (!draft?.suggestion || !permission || !available || sending) return;
    persist();
    const payload = { ...draft, name, email, website };
    if (!validSuggestion(payload)) {
      error = 'Check your suggestion and email before sending.';
      return;
    }
    sending = true;
    error = '';
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/article-contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok || result.accepted !== true || result.id !== draft.requestId)
        throw new Error(result.error || 'Your suggestion could not be sent. Please try again.');
      receipt = result.id;
      draft = null;
      selected = '';
      reason = '';
      name = '';
      email = '';
      permission = false;
      try {
        localStorage.removeItem(suggestionDraftKey);
      } catch {
        /* A retry remains idempotent. */
      }
      storageError = '';
    } catch (cause) {
      error =
        cause instanceof Error && cause.name !== 'AbortError'
          ? cause.message
          : 'Sending was interrupted. Your draft is kept; please try again.';
    } finally {
      sending = false;
      window.clearTimeout(timeout);
    }
  }
</script>

<section class="article-suggestion" aria-labelledby="suggest-article-heading">
  <p class="eyebrow">From your library to Commons</p>
  <h2 id="suggest-article-heading">Suggest one of your articles</h2>
  <p>
    Choose a personal article to share with the Patternverse editor. It will go to the review inbox
    for consideration for Commons.
  </p>
  {#if receipt}
    <div class="confirmation" role="status">
      <strong>Your article suggestion is in the review inbox.</strong>
      <p>
        It will be reviewed before any publication. Your personal article stays in your library.
      </p>
      <small>Receipt: {receipt}</small>
    </div>
  {/if}
  {#if loading}<p role="status">Loading your articles…</p>
  {:else if loadError}<p role="alert">{loadError}</p>
  {:else if !articles.length}<p>
      You don’t have any personal articles with text in this browser yet. <a
        href={resolve('/editor?type=pattern')}>Write an article</a
      >, then come back to suggest it.
    </p>
  {:else}
    <label for="suggestion-article">Your article</label>
    <select
      id="suggestion-article"
      bind:value={selected}
      onchange={chooseArticle}
      disabled={sending || preparing}
    >
      <option value="">Choose an article…</option>
      {#each articles as article (article.id)}<option value={article.id}
          >{article.title} ({article.type})</option
        >{/each}
    </select>
  {/if}
  {#if preparing}<p role="status">Preparing your article copy…</p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if draft?.suggestion}
    <form aria-label="Suggest an article" onsubmit={submit}>
      <fieldset disabled={sending}>
        <legend>Review the copy you’re sharing</legend>
        <div class="preview">
          <h3>{draft.article.title}</h3>
          <p class="article-type">{draft.article.type}</p>
          {#if draft.suggestion.summary}<p>{draft.suggestion.summary}</p>{/if}
          {#if draft.suggestion.attribution}<p>Attribution: {draft.suggestion.attribution}</p>{/if}
          <details>
            <summary>Read the full article text</summary>
            <pre>{draft.suggestion.body}</pre>
          </details>
        </div>
        <p class="privacy">
          Only this article’s title, type, text, summary, attribution and the details you enter
          below are shared. Linked articles and practice answers stay private. Later edits in your
          library won’t change this copy.
        </p>
        <label for="suggestion-reason"
          >Why would this be useful in Commons? <span>(optional)</span></label
        >
        <textarea
          id="suggestion-reason"
          bind:value={reason}
          oninput={(event) => {
            reason = event.currentTarget.value;
            persist();
          }}
          maxlength="4000"
          rows="3"></textarea>
        <div class="contact-fields">
          <div>
            <label for="suggestion-name">Your name <span>(optional)</span></label><input
              id="suggestion-name"
              bind:value={name}
              maxlength="100"
              autocomplete="name"
            />
          </div>
          <div>
            <label for="suggestion-email">Reply email <span>(optional)</span></label><input
              id="suggestion-email"
              type="email"
              bind:value={email}
              maxlength="254"
              autocomplete="email"
            />
          </div>
        </div>
        <div class="honeypot" aria-hidden="true">
          <label for="suggestion-website">Website</label><input
            id="suggestion-website"
            bind:value={website}
            tabindex="-1"
            autocomplete="off"
          />
        </div>
        <label class="permission"
          ><input type="checkbox" bind:checked={permission} required /><span
            >I have permission to share this article for review and possible publication in Commons.</span
          ></label
        >
        {#if checking}<p role="status">Checking submission availability…</p>
        {:else if !available}<p role="status">
            Article submissions are temporarily unavailable. Your suggestion draft is kept in this
            browser; please try again later.
          </p>{/if}
        {#if storageError}<p role="status">{storageError}</p>{/if}
        <button type="submit" disabled={!permission || !available || sending}
          >{sending ? 'Sending…' : 'Suggest article for review'}</button
        >
        <p class="review-note">
          The editor reviews each suggestion. Sending or approval does not publish it automatically.
        </p>
      </fieldset>
    </form>
  {/if}
</section>

<style>
  .article-suggestion {
    margin-bottom: 2.5rem;
    padding: clamp(1rem, 4vw, 2rem);
    border: 1px solid var(--ink);
    background: var(--mint);
  }
  .eyebrow {
    margin: 0 0 0.5rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--green-dark);
  }
  h2 {
    margin: 0 0 0.75rem;
    font-size: 1.5rem;
    letter-spacing: -0.025em;
  }
  p {
    line-height: 1.75;
  }
  h3 {
    margin: 0;
    font-size: 1.25rem;
    overflow-wrap: anywhere;
  }
  label,
  legend {
    display: block;
    font-weight: 600;
    margin: 1rem 0 0.4rem;
  }
  label span,
  .article-type,
  .privacy,
  .review-note {
    font-size: 0.875rem;
  }
  input,
  select,
  textarea {
    width: 100%;
    min-height: 44px;
    padding: 0.65rem;
    border: 1px solid var(--ink);
    background: var(--paper);
    color: var(--ink);
    font: inherit;
    box-sizing: border-box;
  }
  textarea {
    resize: vertical;
  }
  select {
    text-overflow: ellipsis;
  }
  fieldset {
    padding: 0;
    border: 0;
    min-width: 0;
  }
  .preview {
    padding: 1rem;
    border: 1px solid var(--ink);
    background: var(--paper);
  }
  .article-type {
    margin: 0.3rem 0;
    text-transform: capitalize;
  }
  summary {
    cursor: pointer;
    padding-block: 0.5rem;
    min-height: 44px;
    box-sizing: border-box;
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: inherit;
    line-height: 1.75;
    max-height: 26rem;
    overflow-y: auto;
  }
  .contact-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1rem;
  }
  .permission {
    display: flex;
    gap: 0.75rem;
    align-items: flex-start;
    line-height: 1.6;
    margin-block: 1.25rem;
  }
  .permission input {
    width: 20px;
    min-height: 20px;
    margin-top: 0.2rem;
    flex-shrink: 0;
  }
  button {
    min-height: 44px;
    padding: 0.75rem 1rem;
    border: 1px solid var(--ink);
    background: var(--green-dark);
    color: white;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  a {
    text-decoration: underline;
    text-underline-offset: 0.2em;
  }
  .error {
    font-weight: 600;
  }
  .confirmation {
    padding: 1rem;
    border: 1px solid var(--green-dark);
    overflow-wrap: anywhere;
  }
  .honeypot {
    position: absolute;
    left: -10000px;
  }
  @media (max-width: 540px) {
    .contact-fields {
      grid-template-columns: 1fr;
      gap: 0;
    }
    button {
      width: 100%;
    }
  }
</style>

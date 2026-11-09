<script lang="ts">
  import { untrack } from 'svelte';
  import { base } from '$app/paths';
  import { X, BookOpen, RotateCcw } from '@lucide/svelte';
  import type { LocalWorkspace } from '@patternverse/workspace';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import {
    loadBearingsArticle,
    type BearingsArticle,
    type BearingsReadingPattern,
  } from './article';

  let {
    pattern,
    workspace,
    split,
    onclose,
    onrelated,
  }: {
    pattern: BearingsReadingPattern;
    workspace: LocalWorkspace;
    split: boolean;
    onclose: () => void;
    onrelated: (pattern: BearingsReadingPattern) => void;
  } = $props();
  let article = $state.raw<BearingsArticle | null>(null),
    error = $state(''),
    retry = $state(0);
  let dialog = $state<HTMLDialogElement>(),
    closeButton = $state<HTMLButtonElement>(),
    body = $state<HTMLDivElement>();
  let scrollTop = 0;
  let pressedBackdrop = false;
  const uid = $props.id();
  $effect(() => {
    const current = pattern;
    void retry;
    const controller = new AbortController();
    article = null;
    error = '';
    untrack(() => {
      scrollTop = 0;
      if (body) body.scrollTop = 0;
    });
    void loadBearingsArticle(current, workspace, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) article = value;
      })
      .catch((cause) => {
        if (!controller.signal.aborted)
          error = cause instanceof Error ? cause.message : 'This article could not be loaded.';
      });
    return () => controller.abort();
  });
  $effect(() => {
    if (!split && dialog && !dialog.open) dialog.showModal();
  });
  $effect(() => {
    closeButton?.focus({ preventScroll: true });
  });
  $effect(() => {
    if (body) body.scrollTop = scrollTop;
  });
  function outside(event: PointerEvent) {
    if (!dialog || event.target !== dialog) return false;
    const box = dialog.getBoundingClientRect();
    return (
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom
    );
  }
  function articleLinks(element: HTMLElement) {
    const click = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
      if (!anchor || !element.contains(anchor)) return;
      const href = anchor.getAttribute('href')!;
      if (href.startsWith('#')) {
        event.preventDefault();
        try {
          element
            .querySelector<HTMLElement>(`#${CSS.escape(decodeURIComponent(href.slice(1)))}`)
            ?.scrollIntoView({ block: 'start' });
        } catch {
          /* Invalid fragments leave the reader in place. */
        }
        return;
      }
      const url = new URL(anchor.href, location.href);
      const path = url.pathname.slice(base.length);
      if (
        url.origin === location.origin &&
        url.pathname.startsWith(`${base}/`) &&
        /^\/pattern\/[^/]+\/?$/.test(path)
      ) {
        event.preventDefault();
        const id = decodeURIComponent(path.split('/')[2]!);
        onrelated({
          sourceId: 'commons',
          id,
          title: anchor.textContent?.trim() || 'Pattern',
          summary: '',
        });
      } else {
        // Following references should keep the open notebook available.
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
      }
    };
    element.addEventListener('click', click);
    return { destroy: () => element.removeEventListener('click', click) };
  }
  function readerKeys(element: HTMLElement) {
    const keydown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      const modal = [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].at(-1);
      if (modal && modal !== element) return;
      event.preventDefault();
      event.stopPropagation();
      onclose();
    };
    element.addEventListener('keydown', keydown);
    return { destroy: () => element.removeEventListener('keydown', keydown) };
  }
</script>

{#snippet readingContent()}
  <header class="reader-header">
    <div>
      <span class="eyebrow"
        ><BookOpen size={14} aria-hidden="true" />{pattern.sourceId === 'personal'
          ? 'Your pattern'
          : 'Pattern'}</span
      >
      <h2 id={`${uid}-title`}>{article?.title ?? pattern.title}</h2>
    </div>
    <button
      class="close-reader"
      bind:this={closeButton}
      type="button"
      aria-label="Close pattern reader"
      title="Close pattern reader"
      onclick={onclose}><X size={19} /></button
    >
  </header>
  <div
    class="reader-body"
    bind:this={body}
    onscroll={(event) => (scrollTop = event.currentTarget.scrollTop)}
    use:articleLinks
  >
    {#if article}
      {#if article.summary}<p class="reader-summary">{article.summary}</p>{/if}
      <MarkdownRenderer html={article.html} />
    {:else if error}<div class="reader-error" role="alert">
        <p>{error}</p>
        <button type="button" onclick={() => retry++}><RotateCcw size={15} />Try again</button>
      </div>
    {:else}<p class="loading" role="status">Loading pattern…</p>{/if}
  </div>
{/snippet}

{#if split}
  <aside class="pattern-reader" aria-label="Pattern reader" data-mode="split" use:readerKeys>
    {@render readingContent()}
  </aside>
{:else}
  <dialog
    class="pattern-reader reader-overlay"
    aria-label="Pattern reader"
    data-mode="overlay"
    bind:this={dialog}
    use:readerKeys
    oncancel={(event) => {
      event.preventDefault();
      onclose();
    }}
    onpointerdown={(event) => (pressedBackdrop = outside(event))}
    onpointerup={(event) => {
      if (pressedBackdrop && outside(event)) onclose();
      pressedBackdrop = false;
    }}
  >
    {@render readingContent()}
  </dialog>
{/if}

<style>
  .pattern-reader {
    display: flex;
    flex-direction: column;
    min-height: 0;
    min-width: 0;
    height: 100%;
    border-left: 1px solid var(--bearings-line);
    color: var(--bearings-ink);
    background: var(--bearings-paper);
    overflow: hidden;
  }
  .reader-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    flex: none;
    gap: 0.8rem;
    padding: 1.2rem 1.3rem;
    border-bottom: 1px solid var(--bearings-line);
  }
  .reader-header > div {
    min-width: 0;
  }
  .eyebrow {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.68rem;
    color: var(--bearings-muted);
  }
  h2 {
    margin: 0.5rem 0 0;
    font: 750 1.5rem/1.25 var(--font-sans);
    letter-spacing: -0.025em;
    overflow-wrap: anywhere;
  }
  .close-reader {
    flex: none;
    display: grid;
    place-items: center;
    min-width: 36px;
    min-height: 36px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--bearings-muted);
    cursor: pointer;
  }
  .close-reader:hover {
    background: var(--bearings-surface);
    color: var(--bearings-ink);
  }
  .reader-body {
    min-height: 0;
    flex: 1;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.25rem 1.4rem 2.5rem;
    overflow-wrap: anywhere;
    scrollbar-gutter: stable;
  }
  .reader-summary {
    font-size: 0.85rem;
    line-height: 1.7;
    color: var(--bearings-muted);
    margin: 0 0 1.5rem;
  }
  .reader-body :global(.markdown-body) {
    font-size: 0.9rem;
    line-height: 1.75;
  }
  .reader-body :global(.markdown-body h1) {
    font: 750 1.65rem/1.25 var(--font-sans);
    margin: 1rem 0;
  }
  .reader-body :global(.markdown-body h2) {
    font: 750 1.35rem/1.25 var(--font-sans);
    margin: 1.8rem 0 0.8rem;
    border-color: var(--bearings-line);
    letter-spacing: -0.02em;
  }
  .reader-body :global(.markdown-body h3) {
    font-size: 1.05rem;
    margin: 1.5rem 0 0.6rem;
  }
  .reader-body :global(.markdown-body pre) {
    overflow-x: auto;
  }
  .reader-body :global(.markdown-body table) {
    display: block;
    max-width: 100%;
    overflow-x: auto;
    font-size: 0.8rem;
  }
  .loading,
  .reader-error {
    font-size: 0.85rem;
    color: var(--bearings-muted);
    line-height: 1.7;
  }
  .reader-error button {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 40px;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--bearings-line);
    border-radius: 6px;
    background: var(--bearings-surface);
    color: var(--bearings-ink);
    font: inherit;
    cursor: pointer;
  }
  .reader-overlay {
    position: fixed;
    inset: 0;
    width: min(760px, calc(100vw - 2rem));
    max-width: none;
    height: min(850px, calc(100dvh - 3rem));
    max-height: calc(100dvh - 3rem);
    margin: auto;
    padding: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 12px;
    box-shadow: 0 15px 60px #30221133;
  }
  .reader-overlay::backdrop {
    background: #26221f66;
  }
  @media (max-width: 600px) {
    .reader-overlay {
      width: 100%;
      height: 100dvh;
      max-height: 100dvh;
      border: 0;
      border-radius: 0;
    }
    .reader-header {
      padding: 1rem;
    }
    .reader-body {
      padding: 1rem 1rem 2rem;
    }
  }
  @media (pointer: coarse) {
    .close-reader {
      min-width: 44px;
      min-height: 44px;
    }
  }
</style>

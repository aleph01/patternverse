<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { beforeNavigate } from '$app/navigation';
  import { resolve } from '$app/paths';
  import {
    ArrowLeft,
    ArrowRight,
    Check,
    MessageSquarePlus,
    Link2,
    MousePointer2,
    ShieldCheck,
    TextCursorInput,
    X,
  } from '@lucide/svelte';
  import MarkdownRenderer from './MarkdownRenderer.svelte';
  import ArticleFeedbackGrid from './ArticleFeedbackGrid.svelte';
  import ContributionDiff from './ContributionDiff.svelte';
  import CommentPassages from './CommentPassages.svelte';
  import {
    ContributionSurface,
    type ContributionTool,
    type ArticleLinkSelection,
  } from '$lib/contributions/surface';
  import {
    draftKey,
    emptyAnchor,
    newContribution,
    readDraft,
    storeDraft,
    sameLinks,
    commentAnchors,
    anchorKey,
    articleFeedbackBody,
    type ArticleFeedback,
    type ArticleContribution as Submission,
    type ContributionAnchor,
    type ContributionArticle,
    type ContributionComment,
    type ContributionEdit,
  } from '$lib/contributions/model';

  let { html, article }: { html: string; article: ContributionArticle } = $props();
  let active = $state(false),
    view = $state<'editor' | 'review' | 'sent'>('editor');
  let mode = $state<ContributionTool>('comment'),
    showDiff = $state(false);
  let contribution = $state<Submission | null>(null),
    pending = $state<ContributionComment | null>(null);
  let selected = $state<ContributionAnchor[]>([]);
  let addingPassage = $state(false);
  let passageError = $state('');
  let availability = $state<'checking' | 'ready' | 'unavailable'>('checking');
  let sending = $state(false),
    error = $state(''),
    storageError = $state(''),
    receipt = $state('');
  let name = $state(''),
    email = $state(''),
    website = $state('');
  let pageNode = $state<HTMLElement>();
  let feedback = $state<ArticleFeedback>({ categories: [], context: '' });
  let feedbackId = $state('');
  let rewriteExpanded = $state(false);
  let linkDialog = $state<HTMLDialogElement>();
  let linkTarget = $state<ArticleLinkSelection | null>(null);
  let pendingLink = $state<ArticleLinkSelection | null>(null);
  let linkOpen = $state(false),
    linkQuery = $state(''),
    linkError = $state(''),
    linksLoading = $state(false);
  type ArticleChoice = { title: string; type: string; path: string };
  let linkArticles = $state<ArticleChoice[]>([]);
  const linkResults = $derived(
    linkArticles
      .filter(
        (item) =>
          item.path !== article.path &&
          linkQuery
            .toLocaleLowerCase()
            .trim()
            .split(/\s+/)
            .every((word) =>
              `${item.title} ${item.type} ${item.path}`.toLocaleLowerCase().includes(word),
            ),
      )
      .slice(0, 20),
  );
  let articleNode = $state<HTMLElement | undefined>(),
    commentInput = $state<HTMLTextAreaElement>();
  let surface = $state.raw<ContributionSurface | null>(null);
  let checking: AbortController | null = null;
  let cursor = $state<{ x: number; y: number } | null>(null);
  const stale = $derived(
    Boolean(contribution && contribution.article.revision !== article.revision),
  );
  const comments = $derived.by(() => {
    const list = contribution?.comments.slice() ?? [];
    const draft = pending;
    if (draft?.body.trim()) {
      const index = list.findIndex((c) => c.id === draft.id);
      const comment = { ...draft, body: draft.body.trim() };
      if (index >= 0) list[index] = comment;
      else list.push(comment);
    }
    if (feedback.categories.length || feedback.context.trim())
      list.unshift({
        id: feedbackId,
        anchor: emptyAnchor(),
        body: articleFeedbackBody(feedback),
        feedback: { categories: [...feedback.categories], context: feedback.context },
      });
    return list;
  });
  const count = $derived(comments.length + (contribution?.edits.length ?? 0));
  const hasQuickFeedback = $derived(Boolean(feedback.categories.length || feedback.context.trim()));
  const hasPassageChanges = $derived(
    comments.some((comment) => !comment.feedback) || Boolean(contribution?.edits.length),
  );

  function updateFeedback(value: ArticleFeedback) {
    feedback = value;
    persist();
  }
  function sendFeedback() {
    if (hasPassageChanges) void review();
    else void submit();
  }

  function persist() {
    if (!contribution || sending || view === 'sent') return;
    const draft = { ...$state.snapshot(contribution), comments: $state.snapshot(comments) };
    let stored = false;
    try {
      stored = storeDraft(localStorage, draft);
    } catch {
      /* Storage access itself can be denied. */
    }
    if (!stored)
      storageError =
        'This browser could not save your draft. Keep this window open, or download a copy before leaving.';
    else storageError = '';
  }
  async function checkAvailability() {
    checking?.abort();
    const controller = new AbortController();
    checking = controller;
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    availability = 'checking';
    try {
      const response = await fetch('/api/article-contributions/status', {
        cache: 'no-store',
        signal: controller.signal,
      });
      const status = response.ok ? await response.json() : null;
      if (checking === controller)
        availability = status?.available === true ? 'ready' : 'unavailable';
    } catch {
      if (checking === controller) availability = 'unavailable';
    } finally {
      window.clearTimeout(timeout);
    }
  }
  async function start() {
    try {
      contribution = readDraft(localStorage, article) ?? newContribution(article);
    } catch {
      contribution = newContribution(article);
      storageError =
        'This browser blocks local draft storage. Keep this window open or download your draft before leaving.';
    }
    const savedFeedback = contribution.comments.find((comment) => comment.feedback);
    feedback = savedFeedback?.feedback ?? { categories: [], context: '' };
    feedbackId = savedFeedback?.id ?? crypto.randomUUID();
    contribution.comments = contribution.comments.filter((comment) => !comment.feedback);
    rewriteExpanded = Boolean(contribution.comments.length || contribution.edits.length);
    pending = null;
    addingPassage = false;
    passageError = '';
    selected = [];
    error = '';
    receipt = '';
    view = 'editor';
    active = true;
    await tick();
    void checkAvailability();
  }
  function close() {
    if (sending) return;
    if (view !== 'sent') persist();
    cursor = null;
    checking?.abort();
    window.location.assign(resolve(`/${article.type}/${article.id}#suggest-improvement`));
  }
  function saveComment() {
    addingPassage = false;
    passageError = '';
    if (!contribution || !pending?.body.trim()) return;
    const saved = { ...pending, body: pending.body.trim() },
      index = contribution.comments.findIndex((c) => c.id === saved.id);
    if (index >= 0)
      contribution.comments = contribution.comments.map((c) => (c.id === saved.id ? saved : c));
    else contribution.comments = [...contribution.comments, saved];
    pending = null;
    persist();
  }
  async function addComment(
    anchor: ContributionAnchor,
    additionalAnchors: ContributionAnchor[] = [],
    append = false,
  ) {
    if (stale || sending) return;
    const incoming = [anchor, ...additionalAnchors];
    const appendToPending = Boolean(pending && (addingPassage || append));
    const anchors =
      appendToPending && pending ? commentAnchors(pending).filter((a) => a.blockId) : [];
    for (const item of incoming) {
      if (!anchors.some((existing) => anchorKey(existing) === anchorKey(item))) anchors.push(item);
    }
    if (anchors.length > 100) {
      passageError =
        'A comment can reference up to 100 passages. Remove a passage before adding another.';
      return;
    }
    if (appendToPending && pending) {
      pending = { ...pending, anchor: anchors[0]!, additionalAnchors: anchors.slice(1) };
    } else {
      saveComment();
      pending = {
        id: crypto.randomUUID(),
        anchor: anchors[0]!,
        ...(anchors.length > 1 ? { additionalAnchors: anchors.slice(1) } : {}),
        body: '',
      };
    }
    mode = 'comment';
    showDiff = false;
    addingPassage = false;
    passageError = '';
    selected = [];
    cursor = null;
    window.getSelection()?.removeAllRanges();
    persist();
    await tick();
    if (!append) commentInput?.focus();
  }
  function addAnotherPassage() {
    if (!pending) return;
    addingPassage = true;
    passageError = '';
    selected = [];
    mode = 'comment';
    window.getSelection()?.removeAllRanges();
    articleNode?.focus({ preventScroll: true });
  }
  async function stopAddingPassage() {
    addingPassage = false;
    passageError = '';
    selected = [];
    window.getSelection()?.removeAllRanges();
    await tick();
    commentInput?.focus();
  }
  function removePassage(index: number) {
    if (!pending) return;
    const anchors = commentAnchors(pending).filter((_, i) => i !== index);
    pending = {
      ...pending,
      anchor: anchors[0] ?? emptyAnchor(),
      additionalAnchors: anchors.slice(1),
    };
    passageError = '';
    persist();
  }
  async function openComment(id: string) {
    if (pending?.id !== id) saveComment();
    const comment =
      (pending?.id === id ? pending : null) ?? contribution?.comments.find((c) => c.id === id);
    if (!comment) return;
    pending = structuredClone($state.snapshot(comment));
    addingPassage = false;
    passageError = '';
    mode = 'comment';
    showDiff = false;
    await tick();
    commentInput?.focus();
  }
  function editPassage(edit: ContributionEdit) {
    if (!contribution || stale) return;
    contribution.edits = [
      ...contribution.edits.filter((e) => e.blockId !== edit.blockId),
      ...(edit.before === edit.after && sameLinks(edit.beforeLinks, edit.afterLinks) ? [] : [edit]),
    ];
    persist();
  }
  async function loadLinkArticles() {
    if (linkArticles.length) return;
    linksLoading = true;
    linkError = '';
    try {
      const response = await fetch(resolve('/contribute/articles.json'), {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error('Unavailable');
      const data: unknown = await response.json();
      if (
        !Array.isArray(data) ||
        !data.every(
          (item) =>
            item &&
            typeof item.title === 'string' &&
            typeof item.type === 'string' &&
            typeof item.path === 'string' &&
            /^\/(pattern|concept|practice|collection)\/[a-z0-9][a-z0-9._-]*$/.test(item.path),
        )
      )
        throw new Error('Invalid articles');
      linkArticles = data;
    } catch {
      linkError = 'Articles could not be loaded. Try again.';
    } finally {
      linksLoading = false;
    }
  }
  async function openLink() {
    const target = surface?.linkSelection();
    if (!target || stale || mode !== 'edit' || showDiff) return;
    pendingLink = target;
    linkQuery = '';
    linkOpen = true;
    await tick();
    linkDialog?.showModal();
    void loadLinkArticles();
  }
  function closeLink() {
    linkDialog?.close();
    linkOpen = false;
    if (pendingLink) surface?.focusLink(pendingLink);
    pendingLink = null;
  }
  function chooseLink(href: string | null) {
    if (!pendingLink || !surface?.setLink(pendingLink, href)) {
      linkError = 'The selected passage changed. Close this window and select the words again.';
      return;
    }
    closeLink();
  }
  function removeComment(id: string) {
    if (!contribution) return;
    if (pending?.id === id) {
      pending = null;
      addingPassage = false;
    }
    contribution.comments = contribution.comments.filter((c) => c.id !== id);
    persist();
  }
  function cancelComment() {
    addingPassage = false;
    passageError = '';
    pending = null;
    persist();
  }
  async function review() {
    saveComment();
    persist();
    view = 'review';
    cursor = null;
    await tick();
    pageNode?.querySelector<HTMLElement>('[data-review-heading]')?.focus();
  }
  function download() {
    if (!contribution) return;
    const file = new Blob(
      [
        JSON.stringify(
          {
            ...$state.snapshot(contribution),
            comments: $state.snapshot(comments),
            name,
            email,
            website: '',
          },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(file),
      link = document.createElement('a');
    link.href = url;
    link.download = `${article.id}-contribution.json`;
    link.click();
    URL.revokeObjectURL(url);
  }
  async function submit(event?: SubmitEvent) {
    event?.preventDefault();
    if (!contribution || sending || availability !== 'ready' || !count) return;
    error = '';
    persist();
    sending = true;
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch('/api/article-contributions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: controller.signal,
        body: JSON.stringify({
          ...$state.snapshot(contribution),
          comments: $state.snapshot(comments),
          name: name.trim(),
          email: email.trim(),
          website,
        }),
      });
      const result = await response.json();
      if (!response.ok || result?.accepted !== true || result.id !== contribution.requestId) {
        error =
          typeof result?.error === 'string'
            ? result.error
            : 'Your contribution was not accepted. Your draft has been kept; please try again.';
        return;
      }
      receipt = result.id;
      view = 'sent';
      try {
        localStorage.removeItem(draftKey(article.path));
      } catch {
        /* A retained draft is safer than losing an unconfirmed one. */
      }
    } catch {
      error =
        'Your contribution could not be confirmed. Your draft has been kept. Retry to check acceptance without creating a duplicate.';
    } finally {
      window.clearTimeout(timeout);
      sending = false;
    }
  }
  function switchTool(tool: ContributionTool) {
    addingPassage = false;
    mode = tool;
    showDiff = false;
    selected = [];
    cursor = null;
    linkTarget = null;
  }
  function moveCursor(event: PointerEvent) {
    if (
      mode === 'comment' &&
      event.pointerType === 'mouse' &&
      !stale &&
      !(event.target as Element).closest('button,input,textarea,[contenteditable]')
    )
      cursor = { x: event.clientX + 12, y: event.clientY + 12 };
    else cursor = null;
  }
  beforeNavigate(() => {
    if (active) persist();
  });
  onMount(() => {
    void start();
    const leaving = () => {
      if (active) persist();
    };
    window.addEventListener('pagehide', leaving);
    return () => {
      checking?.abort();
      window.removeEventListener('pagehide', leaving);
    };
  });
  $effect(() => {
    if (!active || !articleNode) return;
    const instance = new ContributionSurface(articleNode, {
      comment: (anchor, extras, append) => {
        void addComment(anchor, extras, append);
      },
      select: (anchor) => (selected = anchor),
      edit: editPassage,
      link: (selection) => (linkTarget = selection),
      linkRequest: () => {
        void openLink();
      },
      open: (id) => {
        void openComment(id);
      },
    });
    surface = instance;
    return () => {
      instance.destroy();
      untrack(() => {
        if (surface === instance) surface = null;
      });
    };
  });
  $effect(() => {
    if (surface)
      surface.update(
        stale ? 'comment' : mode,
        contribution?.edits ?? [],
        contribution?.comments ?? [],
        pending,
        showDiff,
        addingPassage,
      );
  });
</script>

{#if active}
  <main class="contribution-page" bind:this={pageNode} aria-labelledby="contribution-title">
    <header class="contribution-header">
      <span>patternverse / contribute</span><button
        type="button"
        class="back-to-article"
        onclick={close}
        disabled={sending}
        aria-label="Back to article"><ArrowLeft size={16} /> Back to article</button
      >
    </header>
    <div class="contribution-heading">
      <p class="eyebrow">Improve this article</p>
      <h1 id="contribution-title">{article.title}</h1>
      <p>Share feedback or suggest a change to this article.</p>
    </div>
    {#if storageError}<p class="notice warning" role="status">
        {storageError}
        <button class="text-button" type="button" onclick={download}>Download draft</button>
      </p>{/if}
    {#if stale}<p class="notice warning" role="status">
        This article has changed since your saved draft. You can review and submit that draft with
        its original passages attached. Start a new contribution after submitting it.
      </p>{/if}
    <div class="contribution-editor" hidden={view !== 'editor'}>
      <section class="quick-feedback" aria-labelledby="quick-feedback-title">
        <h2 id="quick-feedback-title"><span aria-hidden="true">01</span> article feedback</h2>
        <div class="quick-feedback-body">
          <ArticleFeedbackGrid
            value={feedback}
            onchange={updateFeedback}
            disabled={stale || sending}
          />
          <div class="quick-feedback-actions">
            <span aria-live="polite"
              >{feedback.categories.length
                ? `${feedback.categories.length} ${feedback.categories.length === 1 ? 'topic' : 'topics'} selected`
                : 'No topics selected'}</span
            >
            <button
              class="primary"
              type="button"
              onclick={sendFeedback}
              disabled={!count || sending || (!hasPassageChanges && availability !== 'ready')}
            >
              {sending
                ? 'Sending…'
                : hasPassageChanges
                  ? 'Review contribution'
                  : availability === 'checking'
                    ? 'Checking availability…'
                    : 'Send feedback'}<ArrowRight size={16} />
            </button>
          </div>
          <p class="quick-feedback-privacy">
            Feedback is reviewed before publication. <a href={resolve('/privacy')}>Privacy notice</a
            >
          </p>
          {#if availability === 'unavailable'}<p class="notice" role="status">
              Submissions are temporarily unavailable. Your draft is kept on this device. <button
                class="text-button"
                type="button"
                onclick={checkAvailability}>Check again</button
              >
              or
              <button class="text-button" type="button" onclick={download}
                >download your draft</button
              >.
            </p>{/if}
          {#if error}<p class="error" role="alert">{error}</p>{/if}
        </div>
      </section>
      <details class="rewrite-section" bind:open={rewriteExpanded}>
        <summary
          ><span class="rewrite-index" aria-hidden="true">02</span><span>Suggest a rewrite</span
          ><ArrowRight size={16} aria-hidden="true" /></summary
        >
        <p class="rewrite-intro">
          Make an edit or leave a comment, right where it belongs. Your feedback and changes are
          submitted together.
        </p>
        <div class="contribution-topbar">
          <span>Your contribution · draft</span><button
            class="primary"
            type="button"
            onclick={review}
            disabled={!count}
            >Review contribution {#if count}({count}){/if}<ArrowRight size={16} /></button
          >
        </div>
        <div class="tool-hint">
          <MousePointer2 size={15} /><span
            >{stale
              ? 'Review your saved contribution below.'
              : mode === 'comment'
                ? 'Select text or click a passage to comment. Hold Shift to add more passages.'
                : showDiff
                  ? 'Your proposed changes are highlighted below.'
                  : 'Changes appear as you type. Select words to link an article.'}</span
          >{#if selected.length && mode === 'comment' && !addingPassage}<button
              class="secondary small selection-action"
              type="button"
              onpointerdown={(event) => event.preventDefault()}
              onclick={() => selected.length && addComment(selected[0]!, selected.slice(1))}
              >{addingPassage ? 'Add selected text' : 'Comment on selected text'}</button
            >{/if}{#if mode === 'edit'}<button
              class="text-button"
              type="button"
              onclick={() => (showDiff = !showDiff)}
              >{showDiff ? 'Keep editing' : 'See changes'}</button
            >{/if}
        </div>
        <div class="contribution-layout">
          <div
            class="contribution-article"
            role="region"
            aria-label="Article contribution surface"
            tabindex="-1"
            class:stale
            bind:this={articleNode}
            onpointermove={moveCursor}
            onpointerleave={() => (cursor = null)}
          >
            <MarkdownRenderer {html} />
          </div>
          <aside class="contribution-comments" aria-label="Your feedback">
            <div class="rail-heading">
              <h2>Your feedback</h2>
              <span aria-live="polite"
                >{comments.length} {comments.length === 1 ? 'comment' : 'comments'}</span
              >
            </div>
            {#if pending}
              <section
                class="comment-composer"
                class:picking={addingPassage}
                aria-label="Write a comment"
              >
                <header>
                  <h3>
                    {contribution?.comments.some((c) => c.id === pending?.id)
                      ? 'Edit comment'
                      : 'New comment'}
                  </h3>
                  <button
                    type="button"
                    class="icon-button"
                    onclick={cancelComment}
                    aria-label="Close comment"><X size={16} /></button
                  >
                </header>
                {#if commentAnchors(pending).length > 1}<p class="passage-count">
                    {commentAnchors(pending).length} passages · one comment
                  </p>{/if}
                <CommentPassages comment={pending} onremove={removePassage} />
                <p class="shift-select-hint">
                  Hold <kbd>Shift</kbd> while selecting more passages.
                </p>
                <button
                  class="text-button add-passage"
                  type="button"
                  onclick={addAnotherPassage}
                  disabled={addingPassage}>+ Add another passage</button
                >
                {#if passageError}<p class="passage-error" role="alert">{passageError}</p>{/if}
                <label for="article-feedback">Your comment</label><textarea
                  id="article-feedback"
                  bind:this={commentInput}
                  rows="4"
                  maxlength="4000"
                  bind:value={pending.body}
                  oninput={() => {
                    void tick().then(persist);
                  }}
                  placeholder="What could be clearer or more useful?"></textarea>
                <div class="comment-actions">
                  <span>Draft only</span><button
                    class="primary small"
                    type="button"
                    onclick={saveComment}
                    disabled={!pending.body.trim()}>Add comment</button
                  >
                </div>
              </section>
            {:else if !contribution?.comments.length}<div class="feedback-empty">
                <MessageSquarePlus size={24} />
                <h3>Start with a spot in the article.</h3>
                <p>Click to place a pin, or select the words you want to comment on.</p>
              </div>{/if}
            <ol class="feedback-list">
              {#each contribution?.comments ?? [] as comment, i (comment.id)}<li>
                  <header>
                    <span class="comment-number">{i + 1}</span>
                    <div>
                      <h3>
                        {commentAnchors(comment).length > 1
                          ? `${commentAnchors(comment).length} passages`
                          : comment.anchor.sectionTitle}
                      </h3>
                      <small
                        >{commentAnchors(comment).length > 1
                          ? 'One comment'
                          : comment.anchor.quote
                            ? 'Selected text'
                            : comment.anchor.blockId
                              ? 'Comment pin'
                              : 'General feedback'}</small
                      >
                    </div>
                  </header>
                  <CommentPassages {comment} />
                  <p>{comment.body}</p>
                  <div class="comment-actions">
                    <button
                      class="text-button"
                      type="button"
                      onclick={() => openComment(comment.id)}>Edit</button
                    ><button
                      class="text-button"
                      type="button"
                      onclick={() => removeComment(comment.id)}>Remove</button
                    >
                  </div>
                </li>{/each}
            </ol>
            <button
              class="text-button general-comment"
              type="button"
              disabled={stale}
              onclick={() => addComment(emptyAnchor())}
              ><MessageSquarePlus size={15} /> Comment on the whole article</button
            >
          </aside>
        </div>
        <p class="draft-note">
          <ShieldCheck size={15} /> All your edits and comments stay in this draft until you submit them
          together.
        </p>
        {#if addingPassage}
          <div class="passage-picker" role="status">
            <span>Select text or click another passage.</span>
            {#if selected.length}<button
                type="button"
                class="primary small"
                onpointerdown={(event) => event.preventDefault()}
                onclick={() => addComment(selected[0]!, selected.slice(1))}
                >Add selected text</button
              >{/if}
            <button type="button" class="text-button" onclick={stopAddingPassage}>Cancel</button>
            {#if passageError}<span role="alert">{passageError}</span>{/if}
          </div>
        {/if}
        <div class="contribution-dock" role="group" aria-label="Contribution tool">
          <button
            type="button"
            aria-pressed={mode === 'edit'}
            disabled={stale}
            onclick={() => switchTool('edit')}><TextCursorInput size={16} /> Edit text</button
          ><button
            type="button"
            aria-pressed={mode === 'comment'}
            disabled={stale}
            onclick={() => switchTool('comment')}
            ><MessageSquarePlus size={16} /> Leave feedback</button
          >
          {#if mode === 'edit' && !showDiff}<button
              type="button"
              disabled={!linkTarget || stale}
              title="Select words or click an existing link. Shortcut: Ctrl/Cmd+K."
              onclick={openLink}
              ><Link2 size={16} /> {linkTarget?.href ? 'Edit link' : 'Link article'}</button
            >{/if}
        </div>
        {#if linkOpen}
          <dialog
            class="article-link-dialog"
            bind:this={linkDialog}
            aria-labelledby="article-link-title"
            oncancel={(event) => {
              event.preventDefault();
              event.stopPropagation();
              closeLink();
            }}
          >
            <header>
              <h2 id="article-link-title">Link to an article</h2>
              <button
                class="icon-button"
                type="button"
                aria-label="Close link picker"
                onclick={closeLink}><X size={18} /></button
              >
            </header>
            <p class="link-selection">“{pendingLink?.text}”</p>
            {#if pendingLink?.href}<p class="current-link">
                Current link: <span>{pendingLink.href}</span>
              </p>{/if}
            <label for="contribution-article-search">Find an article</label>
            <input
              id="contribution-article-search"
              type="search"
              bind:value={linkQuery}
              placeholder="Search article titles…"
            />
            {#if linksLoading}<p role="status">Loading articles…</p>
            {:else if linkError}<p role="alert">{linkError}</p>
              <button class="secondary small" type="button" onclick={loadLinkArticles}
                >Try again</button
              >
            {:else if !linkResults.length}<p role="status">
                No matching articles. Try a different title.
              </p>
            {:else}<ul class="article-link-results">
                {#each linkResults as item (item.path)}<li>
                    <button
                      type="button"
                      aria-label={`Link to ${item.title}`}
                      onclick={() => chooseLink(item.path)}
                      ><span>{item.title}</span><small>{item.type}</small></button
                    >
                  </li>{/each}
              </ul>{/if}
            {#if pendingLink?.href}<button
                class="text-button"
                type="button"
                onclick={() => chooseLink(null)}>Remove link</button
              >{/if}
          </dialog>
        {/if}
      </details>
    </div>
    {#if view === 'review' && contribution}
      <section class="contribution-review">
        <p class="eyebrow">One last look</p>
        <h2 data-review-heading tabindex="-1">Review your contribution</h2>
        <p>
          {comments.length} comments · {contribution.edits.length} edited passages · One submission
        </p>
        {#each contribution.edits as edit (edit.blockId)}<section class="review-item">
            <h3>{edit.sectionTitle}</h3>
            <ContributionDiff
              before={edit.before}
              after={edit.after}
              beforeLinks={edit.beforeLinks}
              afterLinks={edit.afterLinks}
            />
          </section>{/each}
        <ol class="feedback-list review-comments">
          {#each comments as comment, i (comment.id)}<li>
              <header>
                <span class="comment-number">{i + 1}</span>
                <h3>
                  {commentAnchors(comment).length > 1
                    ? `${commentAnchors(comment).length} passages`
                    : comment.anchor.sectionTitle}
                </h3>
              </header>
              <CommentPassages {comment} full />
              <p>{comment.body}</p>
            </li>{/each}
        </ol>
        <form onsubmit={submit} aria-label="Submit article contribution">
          <fieldset disabled={sending}>
            <div class="identity-fields">
              <label
                >Your name <small>Optional</small><input
                  maxlength="100"
                  autocomplete="name"
                  bind:value={name}
                /></label
              ><label
                >Email <small>Optional</small><input
                  type="email"
                  maxlength="254"
                  autocomplete="email"
                  bind:value={email}
                /></label
              >
            </div>
            <div class="honeypot" aria-hidden="true" inert>
              <label
                >Leave empty<input autocomplete="off" tabindex="-1" bind:value={website} /></label
              >
            </div>
            <p class="privacy-note">
              Your email stays private. Suggestions are reviewed before publication. <a
                href={resolve('/privacy')}>Privacy notice</a
              >
            </p>
            {#if availability === 'unavailable'}<p class="notice" role="status">
                Submissions are temporarily unavailable. Your draft is kept on this device. <button
                  class="text-button"
                  type="button"
                  onclick={checkAvailability}>Check again</button
                >
                or
                <button class="text-button" type="button" onclick={download}
                  >download your draft</button
                >.
              </p>{/if}{#if error}<p class="error" role="alert">{error}</p>{/if}
            <div class="review-actions">
              <button type="button" class="secondary" onclick={() => (view = 'editor')}
                ><ArrowLeft size={15} /> Keep editing</button
              ><button type="submit" class="primary" disabled={sending || availability !== 'ready'}
                >{sending
                  ? 'Submitting…'
                  : availability === 'checking'
                    ? 'Checking availability…'
                    : 'Submit contribution'}</button
              >
            </div>
          </fieldset>
        </form>
      </section>
    {:else if view === 'sent'}<section class="contribution-receipt" role="status">
        <Check size={34} />
        <h2>Thank you for helping make this article better.</h2>
        <p>
          {hasQuickFeedback
            ? 'Your feedback has been received and is waiting for review.'
            : 'Your edits and comments have been received together and are waiting for review.'}
        </p>
        <p class="receipt-id">Reference: {receipt}</p>
        <button class="secondary" type="button" onclick={close}>Back to article</button>
      </section>{/if}
    {#if cursor && view === 'editor' && mode === 'comment'}<div
        class="comment-cursor"
        style:left={`${cursor.x}px`}
        style:top={`${cursor.y}px`}
        aria-hidden="true"
      >
        <MessageSquarePlus size={16} />
      </div>{/if}
  </main>
{:else}
  <p class="loading-feedback" role="status">Preparing your feedback page…</p>
{/if}

<style>
  button {
    cursor: pointer;
    font: inherit;
  }
  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .primary,
  .secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0.65rem 0.9rem;
    border: 1px solid var(--ink);
    border-radius: 6px;
    background: var(--ink);
    color: var(--paper);
    font: 650 0.78rem/1.4 var(--font-sans);
  }
  .secondary {
    background: var(--paper);
    color: var(--ink);
    border-color: #d5d5d1;
  }
  .small {
    min-height: 36px;
    padding: 0.5rem 0.7rem;
    font-size: 0.73rem;
  }
  .text-button {
    background: none;
    border: 0;
    padding: 0.3rem 0;
    text-decoration: underline;
    text-underline-offset: 3px;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .icon-button {
    display: inline-grid;
    place-items: center;
    width: 36px;
    height: 36px;
    background: none;
    border: 0;
    color: var(--muted);
    padding: 4px;
  }
  .contribution-page {
    --contribution-ink: #252522;
    --contribution-soft: #f1f1ee;
    --contribution-border: #deded9;
    width: min(1260px, 100%);
    min-height: 70vh;
    margin: 0 auto;
    border: 0;
    background: #fafaf8;
    color: #252522;
    padding: 0 30px 100px;
    font: 400 14px/1.6 var(--font-sans);
  }
  .contribution-page * {
    box-sizing: border-box;
  }
  .contribution-page h1,
  .contribution-page h2,
  .contribution-page h3,
  .contribution-page p {
    margin: 0;
  }
  .contribution-page .primary {
    background: var(--contribution-ink);
    border-color: var(--contribution-ink);
  }
  .contribution-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid var(--contribution-border);
    padding: 14px 0;
  }
  .contribution-header > span {
    font-size: 0.85rem;
  }
  .contribution-heading {
    padding: 25px 0;
    width: min(100%, 680px);
    margin: 0 auto;
  }
  .back-to-article {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: var(--muted);
    font-size: 0.75rem;
  }
  .quick-feedback {
    width: min(100%, 680px);
    margin: 0 auto 1.5rem;
    border: 1px solid var(--ink);
    background: var(--paper);
  }
  .quick-feedback h2 {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--ink);
    font: 800 0.85rem/1.4 var(--font-sans);
    letter-spacing: -0.02em;
    text-transform: lowercase;
  }
  .quick-feedback h2 span,
  .rewrite-index {
    color: var(--green-dark);
    font-size: 0.7rem;
    font-weight: 850;
    letter-spacing: 0.04em;
  }
  .quick-feedback-body {
    padding: 1.5rem;
  }
  .quick-feedback-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-top: 1rem;
  }
  .quick-feedback-actions > span {
    font-size: 0.75rem;
    color: var(--muted);
  }
  .quick-feedback-privacy {
    margin-top: 0.9rem !important;
    color: var(--muted);
    font-size: 0.7rem;
  }
  .quick-feedback-privacy a {
    text-decoration: underline;
    text-underline-offset: 3px;
  }
  .rewrite-section {
    border-top: 1px solid var(--ink);
  }
  .rewrite-section > summary {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    width: min(100%, 680px);
    min-height: 58px;
    margin: 0 auto;
    padding: 1rem 1.5rem;
    list-style: none;
    font: 750 0.8rem/1.4 var(--font-sans);
    text-transform: lowercase;
    cursor: pointer;
  }
  .rewrite-section > summary::-webkit-details-marker {
    display: none;
  }
  .rewrite-section > summary :global(svg) {
    margin-left: auto;
  }
  .rewrite-section[open] > summary :global(svg) {
    transform: rotate(90deg);
  }
  .rewrite-intro {
    margin: 0 0 1.2rem !important;
    font-size: 0.8rem;
    color: var(--muted);
  }
  .contribution-editor[hidden] {
    display: none;
  }
  .loading-feedback {
    padding: 3rem;
    text-align: center;
  }
  .eyebrow {
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-size: 11px;
    color: var(--contribution-ink);
  }
  .contribution-heading h1 {
    font:
      400 clamp(27px, 4vw, 38px)/1.2 Georgia,
      serif;
    letter-spacing: -0.5px;
    max-width: 800px;
    margin: 10px 0 13px;
  }
  .contribution-heading > p:last-child {
    font-size: 13px;
    color: var(--muted);
  }
  .contribution-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 15px;
    border-bottom: 1px solid var(--contribution-border);
    padding: 0 0 14px;
    flex-wrap: wrap;
  }
  .contribution-topbar > span {
    font-size: 11px;
    color: var(--muted);
  }
  .tool-hint {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    padding: 15px 0;
    font-size: 12px;
    color: var(--muted);
  }
  .tool-hint > span {
    flex: 1;
    min-width: 180px;
  }
  .contribution-layout {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 290px;
    gap: 24px;
    align-items: start;
  }
  .contribution-article {
    min-width: 0;
    padding: 25px 35px 25px 25px;
    border: 1px solid var(--contribution-border);
    border-radius: 8px;
    background: var(--paper);
  }
  .contribution-article.stale {
    pointer-events: none;
  }
  .contribution-article :global(.markdown-body) {
    font-size: 1rem;
  }
  .contribution-article :global(.contribution-text-block) {
    position: relative;
    overflow: visible;
  }
  .contribution-article :global(.contribution-comment-mode) {
    cursor: crosshair;
  }
  .contribution-article:global(.contribution-comment-mode) :global(.contribution-text-block) {
    cursor: crosshair;
  }
  .contribution-article:global(.contribution-comment-mode) :global(.contribution-text-block:hover) {
    background: #fafaf8;
  }
  .contribution-article :global(mark) {
    background: var(--contribution-soft);
    color: inherit;
    box-shadow: 0 2px 0 var(--contribution-ink);
  }
  .contribution-article :global(.contribution-inline-editor) {
    display: block;
    width: 100%;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    min-height: 1lh;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    border-radius: 0;
    box-shadow: none;
    font: inherit;
    line-height: inherit;
  }
  .contribution-article :global(.contribution-deletion) {
    user-select: none;
    pointer-events: none;
    margin-inline-end: 0.15em;
  }
  .contribution-article :global(.contribution-inline-editor a) {
    color: inherit;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: text;
  }
  .contribution-article :global(.contribution-link-change) {
    background: #fff0a6;
  }
  .article-link-dialog {
    width: min(460px, calc(100vw - 32px));
    max-height: min(640px, 85dvh);
    padding: 22px;
    border: 1px solid var(--contribution-border);
    border-radius: 10px;
    background: white;
    color: var(--contribution-ink);
    overflow-y: auto;
    font: 400 14px/1.5 var(--font-sans);
  }
  .article-link-dialog::backdrop {
    background: #18181655;
  }
  .article-link-dialog header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .article-link-dialog h2 {
    font-size: 18px;
  }
  .article-link-dialog label {
    display: block;
    margin-top: 16px;
    font-size: 12px;
    font-weight: 600;
  }
  .article-link-dialog input {
    width: 100%;
    min-height: 44px;
    padding: 10px;
    margin-top: 6px;
    border: 1px solid var(--contribution-border);
    border-radius: 5px;
    font: inherit;
  }
  .article-link-dialog .link-selection {
    margin-top: 10px;
    max-height: 65px;
    overflow: auto;
    color: var(--muted);
  }
  .article-link-dialog .current-link {
    margin-top: 10px;
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  .article-link-results {
    list-style: none;
    padding: 0;
    margin: 12px 0;
    max-height: 300px;
    overflow-y: auto;
  }
  .article-link-results button {
    width: 100%;
    padding: 10px 8px;
    background: none;
    border: 0;
    border-bottom: 1px solid var(--contribution-border);
    text-align: left;
    display: grid;
    gap: 3px;
    color: inherit;
  }
  .article-link-results button:hover {
    background: var(--contribution-soft);
  }
  .article-link-results small {
    font-size: 11px;
    color: var(--muted);
  }
  .contribution-article :global(.contribution-inline-editor:focus-visible) {
    outline: none;
  }
  .contribution-article
    :global(.contribution-text-block:has(.contribution-inline-editor:focus-visible))::before {
    content: '';
    position: absolute;
    left: -12px;
    top: 0;
    bottom: 0;
    width: 2px;
    background: var(--contribution-ink);
  }
  .contribution-article :global(ins) {
    background: #fff0a6;
    color: #181814;
    text-decoration: none;
  }
  .contribution-article :global(.contribution-revert) {
    display: block;
    margin: 4px 0 0 auto;
    min-height: 32px;
    padding: 4px 6px;
    border: 0;
    border-radius: 4px;
    background: transparent;
    color: var(--muted);
    font: 500 12px/1.5 var(--font-sans);
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
  .contribution-article :global(.contribution-revert:hover) {
    background: var(--contribution-soft);
    color: var(--contribution-ink);
  }
  .contribution-article :global(del) {
    background: transparent;
    color: #181814;
    text-decoration: line-through;
  }
  .contribution-article :global(.contribution-pin) {
    position: absolute;
    z-index: 3;
    display: grid;
    place-items: center;
    width: 28px;
    height: 28px;
    min-height: 28px;
    padding: 0;
    border: 2px solid var(--paper);
    border-radius: 50% 50% 50% 2px;
    background: var(--contribution-ink);
    color: var(--paper);
    font: 600 11px/1 var(--font-sans);
    transform: translate(-3px, -24px);
    box-shadow: 0 2px 8px #1a1a1826;
    cursor: pointer;
  }
  .contribution-comments {
    min-width: 0;
    position: sticky;
    top: 15px;
  }
  .rail-heading {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 15px;
  }
  .rail-heading h2 {
    font: 650 13px/1.5 var(--font-sans);
  }
  .rail-heading > span {
    font-size: 11px;
    color: var(--muted);
  }
  .comment-composer {
    padding: 16px;
    background: var(--paper);
    border: 1px solid var(--contribution-ink);
    border-radius: 8px;
    box-shadow: 0 6px 20px #1a1a1814;
    margin-bottom: 14px;
  }
  .comment-composer header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
  }
  .comment-composer h3 {
    font-size: 12px;
  }
  .passage-count {
    font-size: 11px;
    color: var(--muted);
    margin: 8px 0;
  }
  .selection-action {
    position: fixed;
    z-index: 8;
    bottom: calc(82px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    box-shadow: 0 6px 20px #1a1a1814;
  }
  .shift-select-hint {
    margin: 10px 0 0;
    color: var(--muted);
    font-size: 11px;
  }
  .shift-select-hint kbd {
    font: inherit;
    border: 1px solid var(--contribution-border);
    padding: 1px 4px;
    border-radius: 3px;
  }
  @media (min-width: 851px) and (hover: hover) and (pointer: fine) {
    .add-passage {
      display: none;
    }
  }
  @media (pointer: coarse) {
    .shift-select-hint {
      display: none;
    }
  }
  .add-passage {
    margin-top: 4px;
    font-size: 12px;
  }
  .passage-error {
    color: #8b342c;
    font-size: 12px;
  }
  .passage-picker {
    position: fixed;
    z-index: 8;
    bottom: calc(82px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    width: max-content;
    max-width: calc(100% - 34px);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    border: 1px solid var(--contribution-border);
    border-radius: 8px;
    background: var(--paper);
    box-shadow: 0 6px 20px #1a1a1814;
    font-size: 12px;
  }
  .comment-composer label {
    display: block;
    font-size: 11px;
    margin: 12px 0 6px;
  }
  .comment-composer textarea {
    width: 100%;
    min-height: 115px;
    padding: 10px;
    border: 1px solid var(--contribution-border);
    border-radius: 5px;
    font: 400 14px/1.6 var(--font-sans);
    resize: vertical;
    background: var(--paper);
    color: var(--ink);
  }
  .comment-composer .comment-actions {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 12px;
    gap: 8px;
  }
  .comment-composer .comment-actions > span {
    font-size: 11px;
    color: var(--muted);
  }
  .feedback-empty {
    padding: 23px 16px;
    border: 1px dashed var(--contribution-border);
    border-radius: 8px;
    text-align: center;
    color: var(--muted);
  }
  .feedback-empty h3 {
    font-size: 13px;
    margin: 8px 0 !important;
    color: var(--ink);
  }
  .feedback-empty p {
    font-size: 12px;
  }
  .feedback-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 12px;
  }
  .feedback-list > li,
  .review-item {
    background: var(--paper);
    border: 1px solid var(--contribution-border);
    border-radius: 7px;
    padding: 15px;
    min-width: 0;
  }
  .feedback-list header {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    margin-bottom: 9px;
  }
  .comment-number {
    display: grid;
    place-items: center;
    flex-shrink: 0;
    width: 23px;
    height: 23px;
    border-radius: 50%;
    font-size: 11px;
    background: var(--contribution-soft);
  }
  .feedback-list h3 {
    font-size: 12px;
    line-height: 1.5;
  }
  .feedback-list small {
    font-size: 11px;
    color: var(--muted);
  }
  .feedback-list li > p {
    font-size: 12px;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .feedback-list .comment-actions {
    display: flex;
    gap: 15px;
    margin-top: 10px;
  }
  .general-comment {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    text-decoration: none;
  }
  .draft-note {
    border-top: 1px solid var(--contribution-border);
    margin-top: 24px !important;
    padding-top: 18px;
    display: flex;
    gap: 7px;
    align-items: center;
    font-size: 11px;
    color: var(--muted);
  }
  .contribution-dock {
    position: fixed;
    z-index: 8;
    bottom: calc(20px + env(safe-area-inset-bottom));
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 4px;
    max-width: calc(100% - 24px);
    padding: 6px;
    border: 1px solid var(--contribution-border);
    border-radius: 999px;
    background: var(--paper);
    box-shadow: 0 8px 30px #1a1a1824;
  }
  .contribution-dock button {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 44px;
    padding: 9px 16px;
    border: 0;
    border-radius: 999px;
    background: none;
    color: var(--muted);
    font: 500 12px/1.5 var(--font-sans);
    white-space: nowrap;
  }
  .contribution-dock button[aria-pressed='true'] {
    background: var(--contribution-ink);
    color: var(--paper);
  }
  .comment-cursor {
    position: fixed;
    z-index: 9;
    pointer-events: none;
    display: grid;
    place-items: center;
    padding: 7px;
    border-radius: 50% 50% 50% 2px;
    background: var(--contribution-ink);
    color: var(--paper);
  }
  .contribution-review {
    max-width: 780px;
    margin: 25px auto;
  }
  .contribution-review > h2,
  .contribution-receipt h2 {
    font:
      400 29px/1.3 Georgia,
      serif;
    margin: 8px 0 14px;
  }
  .contribution-review > p {
    font-size: 13px;
    color: var(--muted);
  }
  .review-item {
    margin: 18px 0;
  }
  .review-item h3 {
    font-size: 14px;
  }
  .review-comments {
    margin: 20px 0;
  }
  .review-comments li {
    padding: 22px;
  }
  .review-comments h3 {
    font-size: 14px;
  }
  .review-comments li > p {
    font-size: 14px;
  }
  fieldset {
    min-width: 0;
    border: 0;
    padding: 0;
    margin: 0;
  }
  .identity-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 17px;
    margin-top: 25px;
  }
  .identity-fields label {
    display: grid;
    gap: 6px;
    font-size: 12px;
  }
  .identity-fields small {
    color: var(--muted);
  }
  .identity-fields input {
    width: 100%;
    padding: 11px;
    border: 1px solid var(--contribution-border);
    border-radius: 5px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }
  .privacy-note {
    font-size: 12px;
    margin-top: 14px !important;
  }
  .privacy-note a {
    text-decoration: underline;
  }
  .review-actions {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin-top: 25px;
    padding-top: 20px;
    border-top: 1px solid var(--contribution-border);
    flex-wrap: wrap;
  }
  .notice {
    background: var(--contribution-soft);
    padding: 14px;
    font-size: 13px;
    margin: 15px 0 !important;
  }
  .warning {
    background: #fff1cc;
  }
  .error {
    color: #8a251f;
    margin-top: 15px !important;
  }
  .honeypot {
    display: none;
  }
  .contribution-receipt {
    max-width: 600px;
    margin: 70px auto;
    text-align: center;
  }
  .contribution-receipt p {
    margin: 15px 0 25px;
    color: var(--muted);
  }
  .receipt-id {
    font-size: 12px;
    overflow-wrap: anywhere;
  }
  @media (max-width: 850px) {
    .comment-composer.picking {
      display: none;
    }
    .passage-picker {
      flex-wrap: wrap;
      justify-content: center;
    }
    .comment-composer {
      position: fixed;
      z-index: 7;
      left: 17px;
      right: 17px;
      bottom: calc(82px + env(safe-area-inset-bottom));
      max-height: 70dvh;
      overflow-y: auto;
    }
    .comment-composer :global(.comment-passages) {
      max-height: 135px;
    }
    .comment-composer textarea {
      min-height: 95px;
      height: 105px;
    }
    .contribution-layout {
      grid-template-columns: 1fr;
    }
    .contribution-comments {
      position: static;
      border-top: 1px solid var(--contribution-border);
      padding-top: 20px;
    }
    .contribution-article {
      padding: 20px 30px 20px 20px;
    }
  }
  @media (max-width: 520px) {
    .contribution-page {
      padding: 0 17px 110px;
    }
    .contribution-heading {
      padding: 20px 0;
    }
    .quick-feedback h2,
    .quick-feedback-body,
    .rewrite-section > summary {
      padding: 1.1rem;
    }
    .identity-fields {
      grid-template-columns: 1fr;
    }
    .contribution-dock {
      bottom: calc(12px + env(safe-area-inset-bottom));
      gap: 2px;
      padding: 5px;
    }
    .contribution-dock button {
      font-size: 11px;
      padding: 9px 10px;
      gap: 6px;
    }
    .comment-composer textarea,
    .identity-fields input {
      font-size: 16px;
    }
    .comment-cursor {
      display: none;
    }
    .contribution-article :global(.contribution-pin) {
      width: 35px;
      height: 35px;
    }
  }
  @media (pointer: coarse) {
    .icon-button {
      min-width: 44px;
      min-height: 44px;
    }
    .comment-cursor {
      display: none;
    }
  }
</style>

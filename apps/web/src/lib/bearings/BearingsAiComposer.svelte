<script lang="ts">
  import { onMount, tick } from 'svelte';
  import { X, ArrowUp, BookmarkPlus, Bookmark, Sparkles } from '@lucide/svelte';
  import type { BearingsNotebook } from '@patternverse/workspace';
  import { useBearingsAi } from './ai.svelte';
  import { aiSources, aiMessages, parseAiReply, scopeLabel, type AiScope } from './ai';
  import type { SuggestionSource } from './suggestions';
  let {
    notebook,
    cellId,
    onclose,
    oninsert,
    onundo,
  }: {
    notebook: BearingsNotebook;
    cellId: string;
    onclose: () => void;
    oninsert: (text: string) => string | null;
    onundo: (id: string, text: string) => boolean;
  } = $props();
  const ai = useBearingsAi()!;
  const target = $derived(ai.target?.cellId === cellId ? ai.target : null);
  const sources = $derived(aiSources(notebook, cellId, target?.scope ?? 'cell'));
  let field: HTMLTextAreaElement;
  let busy = $state(false),
    error = $state(''),
    draft = $state(''),
    showDraft = $state(false),
    notice = $state('');
  let sourceSnapshot = $state<SuggestionSource[]>([]),
    citations = $state<string[]>([]);
  let inserted = $state<{ id: string; text: string } | null>(null);
  let request: AbortController | undefined;
  function cancel() {
    request?.abort();
    request = undefined;
    busy = false;
  }
  $effect(() => {
    if (!ai.enabled) cancel();
  });
  onMount(() => {
    void tick().then(() => {
      if (ai.enabled) field.focus();
    });
    return cancel;
  });
  async function ask() {
    if (!ai.enabled || !target || busy) return;
    const controller = new AbortController();
    request = controller;
    busy = true;
    error = '';
    notice = '';
    const context = sources.map((source) => ({ ...source }));
    try {
      const reply = await ai.request(
        aiMessages(target.prompt, context, ai.style),
        controller.signal,
      );
      if (request !== controller || controller.signal.aborted || !ai.enabled) return;
      const result = parseAiReply(reply, context);
      draft = result.text;
      citations = result.sourceIds;
      sourceSnapshot = context;
      showDraft = true;
    } catch (cause) {
      if (
        request === controller &&
        !controller.signal.aborted &&
        ai.enabled &&
        !(cause instanceof DOMException && cause.name === 'AbortError')
      )
        error =
          cause instanceof Error ? cause.message : 'The draft could not be created. Try again.';
    } finally {
      if (request === controller) {
        request = undefined;
        busy = false;
      }
    }
  }
  function close() {
    cancel();
    onclose();
  }
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions (Shortcuts delegate from the accessible input controls inside this editor.) -->
<section
  class="ai-composer"
  aria-label="Ask AI"
  onkeydown={(event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close();
    }
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void ask();
    }
  }}
>
  <div class="composer-box">
    <header>
      <span class="ai-label"><span class="tilde">~</span>AI</span><button
        class="library-link"
        onclick={() => {
          ai.tab = 'prompts';
          ai.showLibrary?.();
        }}><Bookmark size={14} />My prompts</button
      ><button class="icon" aria-label="Return to writing" onclick={close}><X size={16} /></button>
    </header>
    <textarea
      bind:this={field}
      aria-label="AI prompt"
      placeholder="Ask something about your notes…"
      rows="3"
      maxlength="12000"
      value={target?.prompt ?? ''}
      oninput={(event) => {
        if (target) ai.target = { ...target, prompt: event.currentTarget.value };
      }}></textarea>
    <div class="composer-footer">
      <label class="context"
        ><span class="sr-only">AI context</span><select
          aria-label="AI context"
          disabled={busy}
          value={target?.scope ?? 'cell'}
          onchange={(event) => {
            if (target) ai.target = { ...target, scope: event.currentTarget.value as AiScope };
          }}
          >{#each ['cell', 'branch', 'situation'] as scope (scope)}<option value={scope}
              >{scopeLabel[scope as AiScope]}</option
            >{/each}</select
        ></label
      ><span class="source-count">{sources.length} {sources.length === 1 ? 'cell' : 'cells'}</span>
      {#if busy}<button class="cancel" onclick={cancel}>Cancel</button>{:else}<button
          class="ask"
          disabled={!ai.enabled || !target?.prompt.trim()}
          onclick={ask}>Ask<ArrowUp size={14} /></button
        >{/if}
    </div>
    <div class="quick-prompts">
      {#each ai.prompts.filter((prompt) => prompt.pinned).slice(0, 2) as prompt (prompt.id)}<button
          onclick={() => {
            if (target) ai.target = { ...target, prompt: prompt.body };
            field.focus();
          }}>{prompt.name}</button
        >{/each}<button
        class="save-prompt"
        aria-label="Save this prompt"
        disabled={!target?.prompt.trim()}
        onclick={(event) => {
          ai.tab = 'prompts';
          ai.showLibrary?.();
          ai.promptDraft = { body: target?.prompt ?? '', trigger: event.currentTarget };
        }}><BookmarkPlus size={15} /></button
      >
    </div>
  </div>
  {#if busy}<p class="hint" role="status">
      Working with {scopeLabel[target?.scope ?? 'cell'].toLowerCase()}…
    </p>{/if}
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if showDraft}<div class="ai-draft">
      <header>
        <span
          ><Sparkles size={13} />{sourceSnapshot.length
            ? 'Draft from your notes'
            : 'AI draft'}</span
        ><button
          class="discard"
          onclick={() => {
            showDraft = false;
          }}>Discard</button
        >
      </header>
      <textarea aria-label="Edit AI draft" bind:value={draft} rows="5" maxlength="24000"></textarea>
      <footer>
        <details>
          <summary
            >{citations.length
              ? `From ${citations.map((id) => sourceSnapshot.find((source) => source.id === id)?.number).join(', ')}`
              : 'Context used'}</summary
          >{#each sourceSnapshot.filter((source) => !citations.length || citations.includes(source.id)) as source (source.id)}<p
            >
              <strong>Cell {source.number}</strong>{source.text}
            </p>{/each}{#if !sourceSnapshot.length}<p>No notebook text was included.</p>{/if}
        </details>
        <button
          class="insert"
          disabled={!draft.trim()}
          onclick={() => {
            const id = oninsert(draft);
            if (id) {
              inserted = { id, text: draft };
              showDraft = false;
              notice = 'Added as a comment';
            }
          }}>Insert as comment</button
        >
      </footer>
    </div>{/if}
  {#if inserted}<div class="added" role="status">
      {notice}<button
        onclick={() => {
          if (inserted && onundo(inserted.id, inserted.text)) {
            inserted = null;
            showDraft = true;
            notice = '';
          } else {
            inserted = null;
            notice = 'That comment has changed and was kept.';
          }
        }}>Undo</button
      >
    </div>{:else if notice}<p class="hint" role="status">{notice}</p>{/if}
</section>

<style>
  .ai-composer {
    margin: 8px 0;
    min-width: 0;
    color: var(--bearings-ink);
    font: 13px/1.65 var(--font-sans);
  }
  .composer-box {
    border: 1px solid var(--bearings-line);
    border-radius: 8px;
    padding: 10px 12px 0;
    background: var(--bearings-paper);
  }
  .composer-box:has(> textarea:focus-visible) {
    border-color: color-mix(in srgb, var(--bearings-accent) 40%, var(--bearings-line));
  }
  header,
  .composer-footer,
  footer {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  header {
    font-size: 11px;
  }
  button {
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    cursor: pointer;
    border-radius: 4px;
    padding: 4px 6px;
  }
  .ai-label {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--bearings-accent);
  }
  .tilde {
    font: 22px/1 monospace;
  }
  .library-link {
    display: flex;
    gap: 5px;
    align-items: center;
    margin-left: auto;
    color: var(--bearings-muted);
    font-size: 11px;
  }
  .icon {
    display: grid;
    place-items: center;
    padding: 4px;
    color: var(--bearings-muted);
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    min-height: 90px;
    padding: 12px 0;
    border: 0;
    background: transparent;
    color: inherit;
    resize: vertical;
    font: inherit;
    line-height: 1.65;
  }
  textarea:focus {
    outline: none;
    box-shadow: none;
  }
  .ai-draft:has(> textarea:focus-visible) {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--bearings-accent) 40%, var(--bearings-line));
  }
  @media (forced-colors: active) {
    textarea:focus-visible {
      outline: 1px solid Highlight;
      outline-offset: 2px;
    }
  }
  .composer-footer {
    padding-bottom: 8px;
    flex-wrap: wrap;
  }
  select {
    max-width: 100%;
    border: 0;
    background: transparent;
    color: var(--bearings-muted);
    font: inherit;
    font-size: 11px;
    padding: 5px 0;
  }
  .source-count {
    color: var(--bearings-muted);
    font-size: 11px;
  }
  .ask,
  .cancel {
    margin-left: auto;
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 12px;
    padding: 5px 9px;
  }
  .ask {
    background: var(--bearings-accent);
    color: var(--bearings-paper);
  }
  button:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .quick-prompts {
    display: flex;
    gap: 4px;
    align-items: center;
    flex-wrap: wrap;
    border-top: 1px solid var(--bearings-line);
    margin: 0 -12px;
    padding: 6px 8px;
  }
  .quick-prompts button {
    font-size: 11px;
    background: var(--bearings-surface);
    color: var(--bearings-muted);
  }
  .save-prompt {
    margin-left: auto;
    display: grid;
    place-items: center;
  }
  .ai-draft {
    margin-top: 12px;
    border-radius: 7px;
    background: #eef0ef;
    padding: 12px;
  }
  .ai-draft header {
    justify-content: space-between;
    color: var(--bearings-muted);
  }
  .ai-draft header span {
    display: flex;
    gap: 5px;
    align-items: center;
  }
  .ai-draft textarea {
    min-height: 120px;
  }
  footer {
    justify-content: space-between;
    align-items: baseline;
    font-size: 11px;
  }
  summary {
    cursor: pointer;
    color: var(--bearings-muted);
  }
  details {
    min-width: 0;
  }
  details p {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    max-height: 200px;
    overflow: auto;
    color: var(--bearings-muted);
  }
  details strong {
    display: block;
  }
  .insert {
    color: var(--bearings-accent);
    white-space: nowrap;
  }
  .hint,
  .added {
    font-size: 11px;
    color: var(--bearings-muted);
    margin: 8px 0;
  }
  .added {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .added button {
    color: var(--bearings-accent);
  }
  .error {
    color: #a32626;
    font-size: 12px;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
  }
  @media (pointer: coarse) {
    textarea {
      font-size: 16px;
    }
    button {
      min-height: 44px;
    }
    select {
      min-height: 44px;
      font-size: 13px;
    }
    .composer-footer {
      gap: 5px;
    }
  }
</style>

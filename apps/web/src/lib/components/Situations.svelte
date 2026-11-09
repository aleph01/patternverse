<script lang="ts">
  import { onMount, tick, untrack } from 'svelte';
  import { resolve } from '$app/paths';
  import { beforeNavigate, goto } from '$app/navigation';
  import { GripVertical, NotebookPen, Pencil, Trash2, X, Plus } from '@lucide/svelte';
  import { getLocalWorkspace } from '$lib/client/workspace';
  import { subscribeWorkspaceChanges } from '$lib/client/workspace-changes';
  import { createWorkspaceRefresh } from '$lib/client/workspace-refresh';
  import {
    createSituationNotebook,
    initialSituationNotebook,
  } from '$lib/client/situation-notebook';
  import { createSituationDrag, type SituationDrag } from '$lib/client/situation-drag';
  import type { LocalWorkspace, Situation } from '@patternverse/workspace';
  import { getPreviewMode } from '$lib/preview/context';
  import PreviewOnly from '$lib/preview/PreviewOnly.svelte';

  const preview = getPreviewMode();

  let workspace = $state<LocalWorkspace>(undefined!);
  let situations = $state<readonly Situation[]>([]);
  let ready = $state(false);
  let error = $state('');
  let newTitle = $state('');
  let busy = $state(false);
  let announcement = $state('');
  let notebook = $state(initialSituationNotebook());
  let drag = $state<SituationDrag | null>(null);
  let dialog: HTMLDialogElement;
  let contextField = $state<HTMLTextAreaElement>(undefined!);
  let titleField = $state<HTMLInputElement>(undefined!);
  let newTitleField = $state<HTMLInputElement>(undefined!);
  let list = $state<HTMLOListElement>(undefined!);
  const canReorder = $derived(situations.length > 1);
  let returnFocus: HTMLButtonElement | undefined;
  let active = true;
  let closing = $state(false);
  const notes = createSituationNotebook({
    save: (...args) => workspace.updateSituation(...args),
    changed: (state) => {
      notebook = state;
    },
    saved: (saved) => {
      situations = situations.map((item) => (item.id === saved.id ? saved : item));
    },
  });
  let leaving = false;
  beforeNavigate((navigation) => {
    if (leaving || !notebook.dirty) return;
    navigation.cancel();
    if (navigation.willUnload) return;
    void notes.flush().then((saved) => {
      if (leaving || !saved || !active || !navigation.to) return;
      leaving = true;
      if (navigation.type === 'popstate') {
        window.history.go(navigation.delta);
        return;
      }
      // SvelteKit has already resolved this destination, including the deployment base.
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      void goto(navigation.to.url);
    });
  });
  const dragging = createSituationDrag({
    list: () => list,
    entries: () => situations,
    blocked: () => busy || !!notebook.selected,
    reordered: (entries) => {
      situations = entries;
    },
    changed: (state) => {
      drag = state;
    },
    persist: move,
    layout: tick,
    requestFrame: (callback) => requestAnimationFrame(callback),
    cancelFrame: (frame) => cancelAnimationFrame(frame),
    viewportHeight: () => window.innerHeight,
    scroll: (delta) => window.scrollBy(0, delta),
  });
  let reload = async () => {};
  let resumeRefresh = async () => {};
  $effect(() => {
    if (!busy && !notebook.selected && !drag) void untrack(resumeRefresh);
  });
  onMount(() => {
    const reader = createWorkspaceRefresh({
      read: async () => {
        workspace ??= await getLocalWorkspace();
        return workspace.listSituations();
      },
      apply: (entries) => {
        situations = entries;
      },
      failed: () => {
        error = 'Could not refresh your situations.';
      },
      settled: () => {
        ready = true;
      },
      canRefresh: () => !notebook.selected && !drag && !busy,
    });
    reload = () => reader.refresh();
    resumeRefresh = reader.resume;
    void reload();
    const refresh = () => {
      void reader.refresh();
    };
    window.addEventListener('focus', refresh);
    const unsubscribe = subscribeWorkspaceChanges(['situations'], refresh);
    return () => {
      active = false;
      reader.dispose();
      dragging.dispose();
      void notes.dispose();
      window.removeEventListener('focus', refresh);
      unsubscribe();
    };
  });
  async function add(event: SubmitEvent) {
    event.preventDefault();
    if (busy || !workspace || !newTitle.trim() || !active) return;
    busy = true;
    error = '';
    try {
      await workspace.createSituation(newTitle);
      if (!active) return;
      newTitle = '';
      const entries = await workspace.listSituations();
      if (!active) return;
      situations = entries;
      announcement = 'Situation added to your queue.';
    } catch (cause) {
      if (active) error = cause instanceof Error ? cause.message : 'Could not add your situation.';
    } finally {
      if (active) busy = false;
    }
  }
  async function open(entry: Situation, event: MouseEvent, rename = false) {
    if (drag || busy || !active || !notes.open(entry)) return;
    returnFocus = event.currentTarget as HTMLButtonElement;
    await tick();
    if (!active || !notebook.selected) return;
    dialog.showModal();
    if (rename) {
      titleField.focus();
      titleField.select();
    } else contextField.focus();
  }
  async function remove(entry: Situation) {
    if (busy || drag || notebook.selected || !workspace || !active) return;
    if (!window.confirm(`Delete “${entry.title}” and its notebook? This cannot be undone.`)) return;
    busy = true;
    error = '';
    const index = situations.findIndex((item) => item.id === entry.id);
    try {
      await workspace.deleteSituation(entry.id, entry.revision);
      if (!active) return;
      situations = situations.filter((item) => item.id !== entry.id);
      announcement = `Deleted “${entry.title}”.`;
    } catch (cause) {
      if (active)
        error = cause instanceof Error ? cause.message : 'Could not delete your situation.';
      return;
    } finally {
      if (active) busy = false;
    }
    await tick();
    if (!active) return;
    const buttons = list?.querySelectorAll<HTMLButtonElement>('.open');
    (buttons?.[Math.min(index, buttons.length - 1)] ?? newTitleField).focus();
  }
  async function close() {
    if (closing || !active) return;
    closing = true;
    try {
      if (!(await notes.close()) || !active) return;
      dialog.close();
      await reload();
      await tick();
      if (active) returnFocus?.focus();
    } finally {
      closing = false;
    }
  }
  async function openBearings() {
    if (!$preview.enabled || closing || !active || !notebook.selected) return;
    const id = notebook.selected.id;
    closing = true;
    try {
      if (!(await notes.close()) || !active) return;
      dialog.close();
      await goto(resolve(`/apps/bearings?situation=${encodeURIComponent(id)}`));
    } finally {
      closing = false;
    }
  }
  async function move(id: string, beforeId: string | null) {
    if (busy || !workspace || !active) return;
    busy = true;
    error = '';
    try {
      const entries = await workspace.moveSituation(id, beforeId);
      if (!active) return;
      situations = entries;
      announcement = `Moved to position ${situations.findIndex((entry) => entry.id === id) + 1}.`;
    } catch (cause) {
      if (!active) return;
      error = cause instanceof Error ? cause.message : 'The new order could not be saved.';
      try {
        const entries = await workspace.listSituations();
        if (active) situations = entries;
      } catch {
        /* Keep the current queue visible. */
      }
    } finally {
      if (active) busy = false;
    }
    await tick();
    if (active)
      [...list.querySelectorAll<HTMLButtonElement>('.drag-handle')]
        .find((button) => button.dataset.id === id)
        ?.focus();
  }
</script>

<svelte:window
  onkeydown={(event) => {
    // Moving a keyed row can remove focus from its handle. Escape must still
    // cancel the pointer preview rather than letting the next pointerup commit it.
    if (event.key === 'Escape' && drag) dragging.key(event, drag.id);
  }}
  onbeforeunload={(event) => {
    if (notebook.dirty) {
      event.preventDefault();
      event.returnValue = '';
    }
  }}
/>
<section class="situations">
  <header>
    <h2>situations</h2>
    <p>Things you’d like to work on, when you have room.</p>
  </header>
  <form onsubmit={add}>
    <input
      bind:this={newTitleField}
      aria-label="New situation"
      placeholder="What’s on your mind?"
      bind:value={newTitle}
      maxlength="180"
      required
      disabled={!ready || !workspace}
    />
    <button class="primary" type="submit" disabled={busy || !ready || !newTitle.trim()}
      ><Plus size={16} aria-hidden="true" />Add</button
    >
  </form>
  {#if error}<p class="error" role="alert">{error}</p>{/if}
  {#if !ready}<p class="empty">Opening your situations…</p>
  {:else if !situations.length}<div class="empty">
      <NotebookPen size={25} aria-hidden="true" />
      <p>Leave a situation here to return to later.</p>
      <span>A title is enough. You can add context whenever it helps.</span>
    </div>
  {:else}
    <div class="list-heading">
      <span>Your queue</span>{#if canReorder}<span>Drag to reorder</span>{/if}
    </div>
    <ol
      bind:this={list}
      onpointermove={dragging.move}
      onpointerup={(event) => {
        void dragging.finish(false, event.pointerId);
      }}
      onpointercancel={(event) => {
        void dragging.finish(true, event.pointerId);
      }}
      onlostpointercapture={(event) => {
        void dragging.finish(true, event.pointerId);
      }}
    >
      {#each situations as entry (entry.id)}
        <li
          class:reorderable={canReorder}
          class:dragging={drag?.id === entry.id && drag.started}
          style:transform={drag?.id === entry.id ? `translateY(${drag.offset}px)` : undefined}
        >
          {#if canReorder}<button
              class="drag-handle"
              data-id={entry.id}
              aria-label={`Reorder: ${entry.title}`}
              aria-describedby="situations-drag-help"
              disabled={busy}
              onpointerdown={(event) => dragging.down(event, entry)}
              onkeydown={(event) => dragging.key(event, entry.id)}
            >
              <GripVertical size={18} aria-hidden="true" />
            </button>{/if}
          <button
            class="open"
            aria-label={`Open notebook: ${entry.title}`}
            onclick={(event) => {
              void open(entry, event);
            }}
            disabled={busy}
          >
            <span>{entry.title}</span>{#if entry.context.trim()}<small
                ><NotebookPen size={13} aria-hidden="true" />Context added</small
              >{/if}
          </button>
          <div class="row-actions">
            <PreviewOnly>
              <a
                class="row-action bearings-link"
                href={resolve(`/apps/bearings?situation=${encodeURIComponent(entry.id)}`)}
                aria-label={`Open Bearings notebook: ${entry.title}`}
                title="Open Bearings notebook"
                onclick={(event) => {
                  if (busy || drag) event.preventDefault();
                }}><NotebookPen size={16} aria-hidden="true" /></a
              >
            </PreviewOnly>
            <button
              class="row-action"
              aria-label={`Rename: ${entry.title}`}
              title="Rename situation"
              disabled={busy || !!drag}
              onclick={(event) => {
                void open(entry, event, true);
              }}><Pencil size={16} aria-hidden="true" /></button
            >
            <button
              class="row-action delete"
              aria-label={`Delete: ${entry.title}`}
              title="Delete situation"
              disabled={busy || !!drag}
              onclick={() => {
                void remove(entry);
              }}><Trash2 size={16} aria-hidden="true" /></button
            >
          </div>
        </li>
      {/each}
    </ol>
    <p class="foot">
      Open a situation to edit its context.<PreviewOnly>
        Use the notebook icon to work through it in Bearings.
      </PreviewOnly>
    </p>
  {/if}
  <span id="situations-drag-help" class="sr-only"
    >Drag to reorder. With keyboard focus on the handle, use the up and down arrow keys.</span
  >
  <span class="sr-only" aria-live="polite">{announcement}</span>
</section>
<dialog
  bind:this={dialog}
  aria-labelledby="situation-notebook-heading"
  oncancel={(event) => {
    event.preventDefault();
    void close();
  }}
>
  {#if notebook.selected}
    <div class="notebook-top">
      <h2 id="situation-notebook-heading">Situation notebook</h2>
      <button
        class="close"
        aria-label="Close notebook"
        onclick={() => {
          void close();
        }}><X size={20} aria-hidden="true" /></button
      >
    </div>
    <label class="title-label" for="situation-title">Situation</label>
    <input
      bind:this={titleField}
      class="notebook-title"
      id="situation-title"
      value={notebook.title}
      maxlength="180"
      oninput={(event) => notes.edit({ title: event.currentTarget.value })}
    />
    <label class="context-label" for="situation-context">Context · optional</label>
    <textarea
      bind:this={contextField}
      id="situation-context"
      value={notebook.context}
      maxlength="100000"
      oninput={(event) => notes.edit({ context: event.currentTarget.value })}
      placeholder="What’s happening? What would you like to change?"></textarea>
    {#if notebook.saveError}<div class="error" role="alert">
        <p>{notebook.saveError}</p>
        <button
          onclick={() => {
            void notes.flush();
          }}>Try saving again</button
        >
      </div>{/if}
    <div class="notebook-footer">
      <span role="status"
        >{notebook.saveError
          ? 'Not saved'
          : notebook.saving || notebook.dirty
            ? 'Saving…'
            : 'Saved on this device'}</span
      >
      <PreviewOnly
        ><button class="primary" onclick={openBearings} disabled={closing}>Open in Bearings</button
        ></PreviewOnly
      >
      <button
        class="primary"
        onclick={() => {
          void close();
        }}>Done</button
      >
    </div>
  {/if}
</dialog>

<style>
  .situations {
    max-width: 760px;
    color: var(--ink);
  }
  header h2 {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.04em;
    margin: 0 0 0.6rem;
  }
  header p {
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.6;
    margin: 0 0 1.6rem;
  }
  form {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 1.8rem;
  }
  input {
    min-width: 0;
    min-height: 44px;
    flex: 1;
    padding: 0.75rem 0.9rem;
    background: white;
    color: var(--ink);
    border: 1px solid #dce0d6;
    border-radius: 6px;
    font: inherit;
    font-size: 1rem;
  }
  button {
    color: inherit;
    font: inherit;
    cursor: pointer;
  }
  button:disabled {
    cursor: default;
    opacity: 0.4;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    min-height: 44px;
    border: 1px solid var(--ink);
    border-radius: 6px;
    padding: 0.75rem 1.2rem;
    background: var(--paper);
    color: var(--ink);
    font-size: 0.82rem;
    font-weight: 700;
  }
  .primary:hover:not(:disabled) {
    background: var(--ink);
    color: var(--paper);
  }
  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--green-dark);
    outline-offset: 3px;
  }
  .list-heading {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    color: var(--muted);
    font-size: 0.75rem;
    padding-bottom: 0.7rem;
    border-bottom: 1px solid #dce0d6;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  li {
    position: relative;
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 0.65rem;
    align-items: center;
    padding: 0.9rem 0;
    border-bottom: 1px solid #dce0d6;
  }
  li.reorderable {
    grid-template-columns: 44px minmax(0, 1fr) auto;
  }
  .row-actions {
    display: flex;
  }
  .row-action {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
  }
  .row-action:hover:not(:disabled) {
    background: #f1f5ec;
    color: var(--ink);
  }
  .bearings-link {
    text-decoration: none;
  }
  .row-action.delete:hover:not(:disabled) {
    color: #9b352b;
  }
  li.dragging {
    z-index: 2;
    background: white;
    border-radius: 8px;
    box-shadow: 0 5px 18px #20271e22;
  }
  .drag-handle {
    border: 0;
    background: transparent;
    color: var(--muted);
    display: grid;
    place-items: center;
    min-height: 44px;
    width: 44px;
    border-radius: 6px;
    touch-action: none;
    cursor: grab;
  }
  .dragging .drag-handle {
    cursor: grabbing;
  }
  .drag-handle:hover,
  .close:hover {
    background: #f1f5ec;
  }
  .open {
    border: 0;
    background: transparent;
    text-align: left;
    min-height: 44px;
    padding: 0.3rem 0;
  }
  .open > span {
    font-weight: 600;
    overflow-wrap: anywhere;
  }
  .open:hover > span {
    color: var(--green-dark);
  }
  .open small {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--muted);
    font-size: 0.75rem;
    margin-top: 0.35rem;
  }
  .foot {
    color: var(--muted);
    font-size: 0.75rem;
    margin: 1.2rem 0 0;
  }
  .empty {
    color: var(--muted);
    padding: 2rem 0;
    font-size: 0.9rem;
  }
  .empty p {
    margin: 0.75rem 0 0.4rem;
    color: var(--ink);
  }
  .empty span {
    font-size: 0.8rem;
  }
  .error {
    color: #9b352b;
    font-size: 0.85rem;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  dialog {
    width: min(520px, calc(100vw - 32px));
    max-height: calc(100dvh - 32px);
    overflow-y: auto;
    padding: 1.8rem;
    border: 1px solid #dce0d6;
    border-radius: 10px;
    background: white;
    color: var(--ink);
  }
  dialog::backdrop {
    background: #20271e55;
  }
  .notebook-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.2rem;
  }
  .notebook-top h2 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.025em;
  }
  .close {
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border: 0;
    background: transparent;
    border-radius: 6px;
  }
  .title-label,
  .context-label {
    display: block;
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--ink);
    margin-bottom: 0.5rem;
  }
  .notebook-title {
    width: 100%;
    box-sizing: border-box;
    padding: 0.6rem 0.75rem;
    margin-bottom: 1.5rem;
    font-family: inherit;
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.3;
    letter-spacing: -0.04em;
  }
  textarea {
    display: block;
    width: 100%;
    min-height: 200px;
    padding: 0 0 0.9rem;
    border: 0;
    border-bottom: 1px solid #dce0d6;
    border-radius: 0;
    background: white;
    color: inherit;
    font: inherit;
    font-size: 1rem;
    line-height: 1.7;
    resize: vertical;
    box-sizing: border-box;
  }
  .notebook-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    margin-top: 1.4rem;
  }
  .notebook-footer span {
    color: var(--muted);
    font-size: 0.75rem;
  }
  @media (max-width: 600px) {
    .notebook-footer {
      flex-wrap: wrap;
    }
    .notebook-footer span {
      flex-basis: 100%;
    }
    dialog {
      padding: 1.2rem;
    }
  }
</style>

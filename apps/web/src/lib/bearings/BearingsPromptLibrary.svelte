<script lang="ts">
  import { Search, Plus, Star, Pencil, X, Trash2 } from '@lucide/svelte';
  import { tick, untrack } from 'svelte';
  import { useBearingsAi } from './ai.svelte';
  import type { SavedPrompt } from './ai';
  let { onuse }: { onuse: (prompt: SavedPrompt) => void } = $props();
  const ai = useBearingsAi()!;
  let query = $state(''),
    name = $state(''),
    body = $state(''),
    pinned = $state(true);
  let editingId = $state<string | null>(null),
    error = $state('');
  let dialog: HTMLDialogElement, nameInput: HTMLInputElement;
  let trigger: HTMLElement | null = null;
  const filtered = $derived(
    [...ai.prompts]
      .filter((prompt) =>
        `${prompt.name} ${prompt.body}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name)),
  );
  $effect(() => {
    const draft = ai.promptDraft;
    if (draft)
      untrack(() => {
        ai.promptDraft = null;
        void edit(null, draft.trigger, draft.body);
      });
  });
  export async function edit(prompt: SavedPrompt | null, element: HTMLElement | null, draft = '') {
    editingId = prompt?.id ?? null;
    name = prompt?.name ?? '';
    body = prompt?.body ?? draft;
    pinned = prompt?.pinned ?? true;
    trigger = element;
    error = '';
    await tick();
    dialog.showModal();
    nameInput.focus();
  }
  function save() {
    if (!name.trim() || !body.trim()) {
      error = 'Give your prompt a name and some instructions.';
      return;
    }
    if (
      ai.savePrompt({
        id: editingId ?? crypto.randomUUID(),
        name: name.trim(),
        body: body.trim(),
        pinned,
      })
    )
      dialog.close();
  }
</script>

<section class="prompt-library" aria-label="My prompts">
  <label class="search"
    ><Search size={15} aria-hidden="true" /><input
      type="search"
      aria-label="Search my prompts"
      placeholder="Search my prompts…"
      bind:value={query}
    /></label
  >
  <div class="prompt-list">
    {#each filtered as prompt (prompt.id)}<div class="prompt-row">
        <button
          class="use-prompt"
          aria-label={`Use prompt: ${prompt.name}`}
          onclick={() => onuse(prompt)}
          ><strong>{prompt.name}</strong><span>{prompt.body}</span></button
        >
        <button
          class="icon"
          class:pinned={prompt.pinned}
          aria-label={`${prompt.pinned ? 'Unpin' : 'Pin'} ${prompt.name}`}
          aria-pressed={prompt.pinned}
          onclick={() => ai.savePrompt({ ...prompt, pinned: !prompt.pinned })}
          ><Star size={14} /></button
        >
        <button
          class="icon"
          aria-label={`Edit ${prompt.name}`}
          onclick={(event) => edit(prompt, event.currentTarget)}><Pencil size={14} /></button
        >
      </div>{/each}
    {#if !ai.prompts.length}<p class="empty">
        Your own prompts, ready when you need them.
      </p>{:else if !filtered.length}<p class="empty">No matching prompts.</p>{/if}
    <button class="new-prompt" onclick={(event) => edit(null, event.currentTarget)}
      ><Plus size={15} />New prompt</button
    >
    {#if ai.storageError}<p class="error" role="alert">{ai.storageError}</p>{/if}
    {#if ai.notice}<p class="empty" role="status">{ai.notice}</p>{/if}
  </div>
</section>
<dialog
  bind:this={dialog}
  class="prompt-editor"
  aria-label={editingId ? 'Edit prompt' : 'New prompt'}
  onclose={() => trigger?.focus({ preventScroll: true })}
  onclick={(event) => {
    if (event.target === dialog) {
      const box = dialog.getBoundingClientRect();
      if (
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom
      )
        dialog.close();
    }
  }}
>
  <header>
    <h2>{editingId ? 'Edit prompt' : 'New prompt'}</h2>
    <button class="icon" aria-label="Close prompt editor" onclick={() => dialog.close()}
      ><X size={17} /></button
    >
  </header>
  <form
    onsubmit={(event) => {
      event.preventDefault();
      save();
    }}
  >
    <label>Name<input bind:this={nameInput} bind:value={name} maxlength="80" required /></label>
    <label>Prompt<textarea bind:value={body} rows="6" maxlength="12000" required></textarea></label>
    <label class="check"><input type="checkbox" bind:checked={pinned} />Pin to quick access</label>
    {#if error || ai.storageError}<p class="error" role="alert">{error || ai.storageError}</p>{/if}
    <footer>
      {#if editingId}<button
          class="delete"
          type="button"
          onclick={() => {
            if (editingId && ai.removePrompt(editingId)) dialog.close();
          }}><Trash2 size={14} />Delete</button
        >{/if}<button class="save" type="submit">Save prompt</button>
    </footer>
  </form>
</dialog>

<style>
  .prompt-library {
    display: flex;
    flex-direction: column;
    min-height: 0;
    flex: 1;
  }
  .search {
    margin: 0 1rem 1rem;
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    padding: 8px 10px;
    color: var(--bearings-muted);
    background: var(--bearings-surface);
  }
  .search input {
    border: 0;
    background: transparent;
    min-width: 0;
    width: 100%;
    font: inherit;
    font-size: 12px;
    color: var(--bearings-ink);
  }
  .prompt-list {
    padding: 0 1rem 1rem;
    overflow: auto;
    min-height: 0;
  }
  .prompt-row {
    display: flex;
    align-items: center;
    gap: 3px;
    border-bottom: 1px solid var(--bearings-line);
    padding: 10px 0;
  }
  button {
    cursor: pointer;
    font: inherit;
    border: 0;
    background: transparent;
    color: inherit;
  }
  .use-prompt {
    min-width: 0;
    flex: 1;
    text-align: left;
    padding: 5px 2px;
  }
  .use-prompt strong {
    display: block;
    font-size: 12px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .use-prompt span {
    display: block;
    margin-top: 4px;
    color: var(--bearings-muted);
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .icon {
    display: grid;
    place-items: center;
    width: 28px;
    height: 30px;
    border-radius: 4px;
    color: var(--bearings-muted);
    padding: 0;
    flex: none;
  }
  .icon.pinned {
    background: var(--bearings-accent-soft);
    color: var(--bearings-accent);
  }
  .new-prompt {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    padding: 5px 0;
    color: var(--bearings-accent);
    font-size: 12px;
  }
  .empty {
    color: var(--bearings-muted);
    font-size: 12px;
    line-height: 1.6;
  }
  .error {
    color: #a32626;
    font-size: 12px;
  }
  .prompt-editor {
    box-sizing: border-box;
    width: 440px;
    max-width: calc(100vw - 24px);
    max-height: calc(100dvh - 24px);
    overflow: auto;
    border: 1px solid var(--bearings-line);
    border-radius: 9px;
    padding: 20px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    font-family: var(--font-sans);
  }
  .prompt-editor::backdrop {
    background: #17231938;
  }
  header,
  footer {
    display: flex;
    align-items: center;
    gap: 12px;
    justify-content: space-between;
  }
  h2 {
    font-size: 14px;
    margin: 0;
  }
  form {
    display: grid;
    gap: 14px;
    margin-top: 16px;
  }
  form > label {
    display: grid;
    gap: 6px;
    font-size: 12px;
    color: var(--bearings-muted);
  }
  form input:not([type='checkbox']),
  textarea {
    width: 100%;
    box-sizing: border-box;
    min-width: 0;
    border: 1px solid var(--bearings-line);
    border-radius: 5px;
    padding: 9px;
    background: var(--bearings-paper);
    color: var(--bearings-ink);
    font: inherit;
  }
  textarea {
    resize: vertical;
    line-height: 1.6;
  }
  form .check {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .save {
    margin-left: auto;
    border-radius: 5px;
    background: var(--bearings-accent);
    color: var(--bearings-paper);
    padding: 8px 12px;
    font-size: 12px;
  }
  .delete {
    display: flex;
    align-items: center;
    gap: 5px;
    color: var(--bearings-muted);
    font-size: 12px;
  }
  @media (pointer: coarse) {
    button {
      min-height: 44px;
    }
    .icon {
      width: 36px;
    }
    form input:not([type='checkbox']),
    textarea {
      font-size: 16px;
    }
  }
</style>

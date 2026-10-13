<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { SourceStatement } from './types';
  import { imageDraft, editImageFields, type ImageDraft } from './image-fields';
  let {
    source,
    statement,
    disabled = false,
    oncommit,
    onpending,
  }: {
    source: string;
    statement: SourceStatement;
    disabled?: boolean;
    oncommit: (source: string) => Promise<boolean>;
    onpending: (pending: boolean) => void;
  } = $props();
  let draft = $state<ImageDraft>(untrack(() => imageDraft(statement)));
  let initial = $state('');
  const dirty = $derived(Boolean(initial) && JSON.stringify(draft) !== initial);
  $effect(() => {
    const item = statement;
    untrack(() => {
      draft = imageDraft(item);
      initial = JSON.stringify(draft);
    });
  });
  $effect(() => onpending(dirty));
  onDestroy(() => onpending(false));
  async function apply() {
    const submitted = JSON.stringify(draft);
    if (
      await oncommit(editImageFields(source, statement, JSON.parse(initial), JSON.parse(submitted)))
    )
      initial = submitted;
  }
</script>

<form
  onsubmit={(event) => {
    event.preventDefault();
    void apply();
  }}
>
  <label>Image URL<input type="url" bind:value={draft.url} {disabled} /></label>
  <label>Alternative text<textarea rows="2" bind:value={draft.alt} {disabled}></textarea></label>
  <p class="hint">Describe the image’s meaning, or leave this empty for a decorative image.</p>
  <label>Title<input bind:value={draft.title} {disabled} /></label>
  <label
    >Caption or guidance<textarea rows="3" bind:value={draft.prompt} {disabled}></textarea></label
  >
  {#if dirty}<div class="actions">
      <button
        type="button"
        {disabled}
        onclick={() => {
          draft = JSON.parse(initial);
        }}>Discard</button
      >
      <button type="submit" {disabled}>Apply changes</button>
    </div>{/if}
</form>

<style>
  form {
    padding: 2px 14px 14px;
    font-size: 13px;
  }
  label {
    display: block;
    margin: 10px 0;
  }
  input,
  textarea {
    display: block;
    width: 100%;
    box-sizing: border-box;
    margin-top: 5px;
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 3px;
    padding: 9px 10px;
    background: var(--paper);
    color: var(--ink);
    font: inherit;
  }
  .hint {
    font-size: 12px;
    color: var(--ink-muted, #626a60);
  }
  .actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
  }
  button {
    padding: 7px 10px;
    font: inherit;
    background: var(--paper);
    color: var(--ink);
    border: 1px solid var(--block-line, #dbe1d7);
    border-radius: 3px;
  }
  @media (max-width: 800px) {
    input,
    textarea {
      font-size: 16px;
    }
    button {
      min-height: 44px;
    }
  }
</style>

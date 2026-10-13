<script lang="ts">
  import { onDestroy, untrack } from 'svelte';
  import type { SourceStatement } from './types';
  import { videoDraft, editVideoFields, type VideoDraft } from './video-fields';
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
  let draft = $state<VideoDraft>(untrack(() => videoDraft(statement)));
  let initial = $state('');
  const dirty = $derived(Boolean(initial) && JSON.stringify(draft) !== initial);
  $effect(() => {
    const item = statement;
    untrack(() => {
      draft = videoDraft(item);
      initial = JSON.stringify(draft);
    });
  });
  $effect(() => onpending(dirty));
  onDestroy(() => onpending(false));
  async function apply() {
    const submitted = JSON.stringify(draft);
    if (
      await oncommit(editVideoFields(source, statement, JSON.parse(initial), JSON.parse(submitted)))
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
  <label>Video URL<input type="url" bind:value={draft.url} {disabled} /></label>
  <label>Title<input bind:value={draft.title} {disabled} /></label>
  <div class="times">
    <label>Start time<input bind:value={draft.start} placeholder="0 or 0:00" {disabled} /></label>
    <label>End time<input bind:value={draft.end} placeholder="Video’s end" {disabled} /></label>
  </div>
  <label>Caption language<input bind:value={draft.captions} placeholder="en" {disabled} /></label>
  <label class="check"
    ><input type="checkbox" bind:checked={draft.autoplay} {disabled} /> Autoplay</label
  >
  <label class="check"
    ><input type="checkbox" bind:checked={draft.muted} {disabled} /> Start muted</label
  >
  <label class="check"
    ><input type="checkbox" bind:checked={draft.loop} {disabled} /> Loop excerpt</label
  >
  <label>Guidance<textarea rows="3" bind:value={draft.prompt} {disabled}></textarea></label>
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
  .times {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .check {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .check input {
    width: auto;
    margin: 0;
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

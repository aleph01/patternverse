<script lang="ts">
  import { tick } from 'svelte';
  import { Check, Pencil, X } from '@lucide/svelte';

  let {
    title,
    approachName,
    renaming,
    renameDraft = $bindable(''),
    onRename,
    onSave,
    onCancel,
  }: {
    title: string;
    approachName: string;
    renaming: boolean;
    renameDraft?: string;
    onRename: () => void;
    onSave: () => void;
    onCancel: () => void;
  } = $props();

  let input = $state<HTMLInputElement>();
  async function beginRename() {
    onRename();
    await tick();
    if (renaming) {
      input?.focus();
      input?.select();
    }
  }
</script>

<div class="mira-chat-toolbar">
  {#if renaming}
    <form
      class="mira-chat-rename"
      onsubmit={(event) => {
        event.preventDefault();
        onSave();
      }}
    >
      <input
        id="mira-chat-session-name"
        aria-label="Session name"
        bind:this={input}
        bind:value={renameDraft}
        maxlength="120"
        onkeydown={(event) => {
          if (event.key === 'Escape') onCancel();
        }}
      />
      <button
        class="mira-icon-button"
        type="submit"
        aria-label="Save session name"
        disabled={!renameDraft.trim()}><Check size={17} /></button
      >
      <button class="mira-icon-button" type="button" aria-label="Cancel rename" onclick={onCancel}
        ><X size={17} /></button
      >
    </form>
  {:else}
    <div class="mira-chat-title">
      <h2>{title}</h2>
      <button
        class="mira-icon-button"
        type="button"
        aria-label="Rename session"
        title="Rename session"
        onclick={beginRename}><Pencil size={15} /></button
      >
    </div>
  {/if}
  <span>{approachName}</span>
</div>

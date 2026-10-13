<script lang="ts">
  import type { Snippet } from 'svelte';
  import { X } from '@lucide/svelte';
  import { focusPicker } from './dialog-focus';
  import type { VoiceChoice } from './voice-commands';
  let {
    choices,
    search = $bindable(''),
    selected,
    onSelect,
    onClose,
    feedback,
    restoreFocus = true,
  }: {
    choices: readonly VoiceChoice[];
    search?: string;
    selected: string;
    onSelect: (id: string) => void;
    onClose: () => void;
    feedback: Snippet;
    restoreFocus?: boolean;
  } = $props();
</script>

<div
  class="mira-technique-overlay"
  role="presentation"
  onclick={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby="mira-modality-title"
    class="mira-technique-dialog"
    tabindex="-1"
    use:focusPicker={{ close: onClose, restoreFocus }}
  >
    <div class="mira-guided-heading">
      <h2 id="mira-modality-title">Therapy approach</h2>
      <button type="button" aria-label="Close therapy approaches" onclick={onClose}
        ><X size={20} /></button
      >
    </div>
    <label class="visually-hidden" for="mira-modality-search">Search therapy approaches</label>
    <input
      id="mira-modality-search"
      type="search"
      placeholder="Search therapy approaches…"
      bind:value={search}
    />
    {@render feedback()}
    <div class="mira-technique-list">
      {#each choices as choice, index (choice.id)}<button
          type="button"
          aria-pressed={choice.id === selected}
          onclick={() => onSelect(choice.id)}
          ><span><span class="mira-choice-number">{index + 1}</span> {choice.label}</span></button
        >{/each}
      {#if !choices.length}<p>No matching therapy approaches.</p>{/if}
    </div>
  </div>
</div>

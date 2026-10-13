<script lang="ts">
  import { X } from '@lucide/svelte';
  import type { Snippet } from 'svelte';
  import { handleDialogKeydown } from './dialog-focus';

  let {
    heading,
    headingId,
    closeLabel,
    onClose,
    settings = false,
    error,
    notice,
    feedback,
    children,
  }: {
    heading: string;
    headingId: string;
    closeLabel: string;
    onClose: () => void;
    settings?: boolean;
    error: string;
    notice: string;
    feedback: Snippet;
    children: Snippet;
  } = $props();
</script>

<div
  class="mira-app-panel mira-drawer"
  class:mira-settings={settings}
  role="dialog"
  aria-modal="true"
  tabindex="-1"
  onkeydown={(event) => handleDialogKeydown(event, event.currentTarget, onClose)}
  aria-labelledby={headingId}
>
  {@render feedback()}
  <div class="mira-section-heading">
    <div><h2 id={headingId}>{heading}</h2></div>
    <button type="button" class="mira-icon-button" aria-label={closeLabel} onclick={onClose}
      ><X size={20} /></button
    >
  </div>
  {#if error}<p class="mira-app-alert" role="alert">{error}</p>{/if}
  {#if notice}<p class="mira-app-notice" role="status">{notice}</p>{/if}
  {@render children()}
</div>

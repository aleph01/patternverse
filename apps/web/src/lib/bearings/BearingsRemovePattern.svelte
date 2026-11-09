<script lang="ts">
  import { X } from '@lucide/svelte';
  let { onremove }: { onremove: () => void } = $props();
</script>

<button
  class="remove-pattern"
  type="button"
  aria-label="Remove pattern"
  title="Remove pattern"
  onclick={onremove}
>
  <X size={16} aria-hidden="true" />
</button>

<style>
  .remove-pattern {
    position: absolute;
    top: 8px;
    right: 8px;
    z-index: 2;
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--bearings-muted);
    cursor: pointer;
  }
  .remove-pattern:hover {
    background: var(--bearings-surface);
    color: var(--bearings-ink);
  }
  .remove-pattern:focus-visible {
    outline: 2px solid var(--bearings-accent);
    outline-offset: 2px;
  }
  @media (pointer: coarse) {
    .remove-pattern {
      width: 44px;
      height: 44px;
    }
  }
</style>

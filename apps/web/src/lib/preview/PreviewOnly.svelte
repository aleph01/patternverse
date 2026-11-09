<script lang="ts">
  import type { Snippet } from 'svelte';
  import { getPreviewMode } from './context';

  let { children, fallback }: { children: Snippet; fallback?: Snippet } = $props();
  const preview = getPreviewMode();
</script>

{#if $preview.enabled}
  {@render children()}
{:else if $preview.ready}
  {@render fallback?.()}
{/if}

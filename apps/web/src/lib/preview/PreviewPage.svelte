<script lang="ts">
  import type { Snippet } from 'svelte';
  import { resolve } from '$app/paths';
  import PreviewOnly from './PreviewOnly.svelte';

  let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

<PreviewOnly>
  {@render children()}
  {#snippet fallback()}
    <main class="preview-unavailable">
      <h1>This page is in preview</h1>
      <p>It isn’t part of the public experience yet.</p>
      <a href={resolve('/')}>Return to Patternverse</a>
    </main>
  {/snippet}
</PreviewOnly>

<style>
  .preview-unavailable {
    max-width: 42rem;
    margin: 4rem auto;
    padding: 1.5rem;
  }
</style>

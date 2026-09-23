<script lang="ts">
  import { renderMarkdownPreview } from '$lib/client/markdown-preview';
  import MarkdownRenderer from './MarkdownRenderer.svelte';

  let { markdown }: { markdown: string } = $props();
  let html = $state('');

  $effect(() => {
    const current = markdown;
    void renderMarkdownPreview(current).then((rendered) => {
      if (current === markdown) html = rendered;
    });
  });
</script>

<MarkdownRenderer {html} />

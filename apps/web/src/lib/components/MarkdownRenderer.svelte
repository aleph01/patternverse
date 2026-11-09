<script lang="ts">
  import { articleWidgets } from '$lib/article-widgets/mount';
  import { articleVideos } from '$lib/article-videos/mount';
  let { html }: { html: string } = $props();
</script>

<div class="markdown-body" use:articleWidgets={html} use:articleVideos={html}>
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</div>

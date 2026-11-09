<script lang="ts">
  import { renderMarkdownPreview } from '$lib/client/markdown-preview';
  let { text }: { text: string } = $props();
  let html = $state('');
  $effect(() => {
    const current = text;
    void renderMarkdownPreview(current, { strikethrough: false }).then((value) => {
      if (current === text) html = value;
    });
  });
</script>

<div class="cell-markdown" inert aria-hidden="true">
  <!-- eslint-disable-next-line svelte/no-at-html-tags -->
  {@html html}
</div>

<style>
  .cell-markdown {
    overflow-wrap: anywhere;
    line-height: 1.7;
    text-align: left;
  }
  .cell-markdown :global(:first-child) {
    margin-top: 0;
  }
  .cell-markdown :global(:last-child) {
    margin-bottom: 0;
  }
  .cell-markdown :global(p) {
    margin: 0.5em 0;
  }
  .cell-markdown :global(h1),
  .cell-markdown :global(h2),
  .cell-markdown :global(h3) {
    font-family: inherit;
    font-weight: 650;
    line-height: 1.3;
    margin: 0.7em 0 0.3em;
  }
  .cell-markdown :global(h1) {
    font-size: 1.7em;
  }
  .cell-markdown :global(h2) {
    font-size: 1.4em;
  }
  .cell-markdown :global(h3) {
    font-size: 1.15em;
  }
  .cell-markdown :global(ul),
  .cell-markdown :global(ol) {
    padding-left: 1.5em;
    margin: 0.5em 0;
  }
  .cell-markdown :global(li > p) {
    margin: 0.1em 0;
  }
  .cell-markdown :global(blockquote) {
    border-left: 2px solid var(--bearings-line);
    margin: 0.5em 0;
    padding-left: 0.8em;
  }
  .cell-markdown :global(code),
  .cell-markdown :global(pre) {
    font-family: ui-monospace, monospace;
    font-size: 0.9em;
    background: var(--bearings-surface);
    border-radius: 4px;
  }
  .cell-markdown :global(pre) {
    padding: 0.7em;
    white-space: pre-wrap;
  }
  .cell-markdown :global(a) {
    color: var(--bearings-accent);
    text-decoration: underline;
  }
  .cell-markdown :global(table) {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  .cell-markdown :global(td),
  .cell-markdown :global(th) {
    border: 1px solid var(--bearings-line);
    padding: 0.3em;
  }
</style>

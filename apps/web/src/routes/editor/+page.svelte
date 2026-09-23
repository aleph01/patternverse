<script lang="ts">
  import EntityEditor from '$lib/components/EntityEditor.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Markdown editor — Patternverse</title>
  <meta
    name="description"
    content="Create and edit private procedural knowledge in your browser."
  />
</svelte:head>

<main class="editor-page">
  <EntityEditor commonsEntities={data.entities} />
</main>

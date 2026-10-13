<script lang="ts">
  import PracticeEmbed from '$lib/pattern-embed/PracticeEmbed.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>{data.title} — Practice embed prototype</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<PracticeEmbed source={data.source} title={data.title} />

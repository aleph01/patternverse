<script lang="ts">
  import TenderWilds from '$lib/apps/tender-wilds/TenderWilds.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Tender Wilds — Patternverse</title>
  <meta
    name="description"
    content="Build habits through play. Grow a garden, discover new seeds, and explore a world of your own."
  />
</svelte:head>
<TenderWilds patterns={data.patterns} />

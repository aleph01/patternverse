<script lang="ts">
  import BearingsApp from '$lib/bearings/BearingsApp.svelte';
  import { resolve } from '$app/paths';
  import PreviewPage from '$lib/preview/PreviewPage.svelte';
  let { data } = $props();
</script>

<svelte:head>
  <title>Bearings — A space to work things through</title>
  <meta
    name="description"
    content="Work through your situations with a private notebook, practical patterns, and room for your own approach."
  />
  <link rel="icon" type="image/png" href={`${resolve('/apps/bearings/icon.png')}?v=green`} />
</svelte:head>
<PreviewPage>
  <BearingsApp patterns={data.patterns} references={data.references} />
</PreviewPage>

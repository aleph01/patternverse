<script lang="ts">
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import PwaStatus from '$lib/components/PwaStatus.svelte';
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <title>Patternverse — Find a useful pattern</title>
</svelte:head>

<SiteHeader />
<PwaStatus />
{@render children()}
<SiteFooter />

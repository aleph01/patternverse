<script lang="ts">
  import { page } from '$app/state';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import PwaStatus from '$lib/components/PwaStatus.svelte';
  import '../app.css';

  let { children } = $props();
  const companionPage = $derived(page.url.pathname === '/mira');
</script>

<svelte:head>
  <title>Patternverse — Find a useful pattern</title>
</svelte:head>

{#if !companionPage}<SiteHeader /><PwaStatus />{/if}
{@render children()}
{#if !companionPage}<SiteFooter />{/if}

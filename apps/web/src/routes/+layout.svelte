<script lang="ts">
  import { page } from '$app/state';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import PwaStatus from '$lib/components/PwaStatus.svelte';
  import DropboxAutomaticSync from '$lib/components/DropboxAutomaticSync.svelte';
  import '../app.css';

  let { children } = $props();
  const companionPage = $derived(
    page.url.pathname === '/mira' ||
      page.url.pathname.replace(/\/$/, '') === '/apps/tender-wilds' ||
      /^\/pattern\/[^/]+\/run\/?$/.test(page.url.pathname) ||
      page.url.pathname.startsWith('/embed/'),
  );
</script>

<svelte:head>
  <title>Patternverse — Find a useful pattern</title>
</svelte:head>

{#if !companionPage}<SiteHeader /><PwaStatus />{/if}
<DropboxAutomaticSync />
{@render children()}
{#if !companionPage}<SiteFooter />{/if}

<script lang="ts">
  import { page } from '$app/state';
  import { afterNavigate, replaceState } from '$app/navigation';
  import { cacheCurrentVisit, registerPwaWorker, trackClientVersion } from '$lib/client/pwa';
  import { trackFontSize } from '$lib/client/text-preferences';
  import { onMount } from 'svelte';
  import SiteFooter from '$lib/components/SiteFooter.svelte';
  import SiteHeader from '$lib/components/SiteHeader.svelte';
  import PwaStatus from '$lib/components/PwaStatus.svelte';
  import DropboxAutomaticSync from '$lib/components/DropboxAutomaticSync.svelte';
  import { providePreviewMode } from '$lib/preview/context';
  import { PREVIEW_QUERY } from '$lib/preview/mode';
  import '../app.css';

  let { children } = $props();
  const preview = providePreviewMode(import.meta.env.VITE_PREVIEW_ENABLED !== 'false');
  function cleanPreviewOptOut() {
    if (!$preview.ready) return;
    const values = page.url.searchParams.getAll(PREVIEW_QUERY);
    if (values.length !== 1 || values[0] !== '0') return;
    const url = new URL(page.url);
    url.searchParams.delete(PREVIEW_QUERY);
    // eslint-disable-next-line svelte/no-navigation-without-resolve -- The current URL already includes the deployment base.
    replaceState(url, page.state);
  }
  const embedPage = $derived(page.url.pathname.startsWith('/embed/'));
  afterNavigate(() => {
    preview.navigate(page.url);
    // The initial afterNavigate callback runs just before the router finishes starting.
    queueMicrotask(cleanPreviewOptOut);
    if (!embedPage) cacheCurrentVisit();
  });
  onMount(() => {
    preview.initialize(new URL(window.location.href), () => window.sessionStorage);
  });
  onMount(() => {
    void registerPwaWorker();
    if (!embedPage) return trackClientVersion();
  });
  onMount(() => {
    if (!embedPage) return trackFontSize();
  });
  const companionPage = $derived(
    page.url.pathname === '/mira' ||
      page.url.pathname.replace(/\/$/, '') === '/apps/bearings' ||
      page.url.pathname.replace(/\/$/, '') === '/apps/tender-wilds' ||
      /^\/pattern\/[^/]+\/run\/?$/.test(page.url.pathname) ||
      page.url.pathname.startsWith('/embed/'),
  );
</script>

<svelte:head>
  <title>Patternverse — Find a useful pattern</title>
</svelte:head>

{#if !companionPage}<SiteHeader /><PwaStatus />{/if}
{#if !embedPage}<DropboxAutomaticSync />{/if}
{@render children()}
{#if !companionPage}<SiteFooter />{/if}

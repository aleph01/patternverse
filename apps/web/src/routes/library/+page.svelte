<script lang="ts">
  import { browser } from '$app/environment';
  import { afterNavigate, goto } from '$app/navigation';
  import { page } from '$app/state';
  import WorkspaceLibrary from '$lib/components/WorkspaceLibrary.svelte';
  import type { LibraryScope } from '$lib/client/workspace-library-view';
  import type { Snapshot } from '@sveltejs/kit';
  import type { DesktopLibrarySnapshot } from '$lib/client/library-browse-snapshot';

  let { data } = $props();
  let query = $state('');
  let scope = $state<LibraryScope>('explore');
  let library = $state<{
    captureDesktopState: () => DesktopLibrarySnapshot | null;
    restoreDesktopState: (snapshot: DesktopLibrarySnapshot) => void;
  }>();
  export const snapshot: Snapshot<DesktopLibrarySnapshot | null> = {
    capture: () => library?.captureDesktopState() ?? null,
    restore: (saved) => {
      if (saved) library?.restoreDesktopState(saved);
    },
  };
  const selectedVerse = $derived(browser ? page.url.searchParams.get('verse') || 'all' : 'all');

  function updateVerse(key: string) {
    const url = new URL(page.url);
    if (key === 'all') url.searchParams.delete('verse');
    else url.searchParams.set('verse', key);
    if (url.href !== page.url.href) {
      // Copied from the current page URL, which already includes the configured base path.
      // eslint-disable-next-line svelte/no-navigation-without-resolve
      void goto(url, { keepFocus: true, noScroll: true });
    }
  }

  afterNavigate(({ from, type }) => {
    if (
      type !== 'popstate' &&
      page.url.searchParams.has('verse') &&
      from?.route.id !== page.route.id
    )
      scope = 'explore';
  });
</script>

<svelte:head>
  <title>Library — Patternverse</title>
  <meta
    name="description"
    content="Browse and search patterns and collections by Verse in Patternverse."
  />
</svelte:head>

<main class="library-page">
  <WorkspaceLibrary
    bind:this={library}
    commons={data.entities}
    searchAsset={data.searchAsset}
    commonsVerses={data.verses}
    bind:query
    bind:scope
    bind:selectedVerse={() => selectedVerse, updateVerse}
    initialTypes={['collection']}
    eyebrow="Patternverse library"
    heading="Browse the library"
    mobileCollections
  >
    {#snippet intro()}
      <header class="library-page-intro">
        <div class="library-intro-copy">
          <h1>the library.</h1>
          <p>Explore the Commons and keep useful patterns and collections in your library.</p>
        </div>
      </header>
    {/snippet}
  </WorkspaceLibrary>
</main>

<style>
  .library-page-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 2rem;
    padding: 2.5rem 0;
    background: var(--paper);
    border-bottom: 0;
  }
  .library-page-intro::after {
    display: none;
  }
  .library-page-intro h1 {
    max-width: none;
    font-family: inherit;
    font-weight: 850;
    font-size: clamp(2rem, 4vw, 3.25rem);
    letter-spacing: -0.055em;
    line-height: 1.08;
  }
  .library-intro-copy > p {
    max-width: 50ch;
    margin: 1rem 0 0;
    font-size: 1rem;
    line-height: 1.5;
    color: var(--muted);
  }
  @media (max-width: 800px) {
    .library-page {
      background: var(--paper);
    }
    .library-page-intro {
      display: none;
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
      padding: 1.4rem 20px 1.2rem;
      background: var(--paper);
    }
    .library-page-intro h1 {
      text-transform: lowercase;
    }
    .library-intro-copy > p {
      margin-top: 0.9rem;
    }
  }
</style>

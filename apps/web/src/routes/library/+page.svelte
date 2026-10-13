<script lang="ts">
  import WorkspaceLibrary from '$lib/components/WorkspaceLibrary.svelte';

  let { data } = $props();
  let query = $state('');
</script>

<svelte:head>
  <title>Library — Patternverse</title>
  <meta
    name="description"
    content="Browse and search patterns and collections by Verse in Patternverse."
  />
</svelte:head>

<main class="library-page">
  <header class="library-page-intro">
    <div class="library-intro-copy">
      <p>Patternverse library</p>
      <h1>
        <span class="desktop-copy">your library.</span><span class="mobile-copy"
          >Find your next<br />pattern.</span
        >
      </h1>
      <p class="desktop-copy">
        Keep a few useful patterns close. Explore the rest when you need them.
      </p>
      <p class="mobile-copy">Start with what you want to explore.</p>
    </div>
  </header>
  <WorkspaceLibrary
    commons={data.entities}
    commonsSearchDocuments={data.searchDocuments}
    commonsVerses={data.verses}
    bind:query
    initialTypes={['pattern']}
    eyebrow="Your library"
    heading="Browse the library"
    mobileCollections
  />
</main>

<style>
  .mobile-copy {
    display: none;
  }
  .library-page-intro {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: center;
    gap: 2rem;
    padding: 2.5rem max(5vw, calc((100vw - 1280px) / 2));
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
  .library-intro-copy > p:first-child {
    margin: 0 0 0.75rem;
    color: var(--green-dark);
    font-size: 0.76rem;
    font-weight: 850;
    text-transform: lowercase;
  }
  .library-intro-copy > p:not(:first-child) {
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
    .desktop-copy,
    .library-intro-copy > p:first-child {
      display: none;
    }
    .mobile-copy {
      display: block;
    }
    .library-page-intro {
      grid-template-columns: minmax(0, 1fr);
      gap: 0;
      padding: 1.4rem 20px 1.2rem;
      background: var(--paper);
    }
    .library-page-intro h1 {
      text-transform: lowercase;
    }
    .library-intro-copy > p:not(:first-child) {
      margin-top: 0.9rem;
    }
  }
</style>

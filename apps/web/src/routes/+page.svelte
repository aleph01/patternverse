<script lang="ts">
  import { resolve } from '$app/paths';
  import WorkspaceLibrary from '$lib/components/WorkspaceLibrary.svelte';
  import { verseAccentClass } from '$lib/verse-accent';

  let { data } = $props();

  const VERSE_PREVIEW_LIMIT = 16;
  let versesExpanded = $state(false);
  let libraryQuery = $state('');
  let visibleVerses = $derived(
    versesExpanded ? data.verses : data.verses.slice(0, VERSE_PREVIEW_LIMIT),
  );
  let hiddenVerseCount = $derived(Math.max(0, data.verses.length - VERSE_PREVIEW_LIMIT));

  const submitSearch = (event: SubmitEvent): void => {
    event.preventDefault();
    document.querySelector('#library')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.replaceState(null, '', `${location.pathname}${location.search}#library`);
  };
</script>

<svelte:head>
  <meta
    name="description"
    content="Find practical patterns, concepts, and practices in one personal knowledge library."
  />
  <meta property="og:title" content="Patternverse" />
  <meta
    property="og:description"
    content="Find practical patterns, concepts, and practices in one personal knowledge library."
  />
</svelte:head>

<main>
  <section class="hero" aria-labelledby="hero-heading">
    <div class="hero-blocks" aria-hidden="true">
      <span class="hero-block hero-block-green"></span>
      <span class="hero-block hero-block-blue"></span>
      <span class="hero-block hero-block-coral"></span>
      <span class="hero-block hero-block-yellow"></span>
    </div>
    <div class="eyebrow">Your procedural knowledge library</div>
    <h1 id="hero-heading">Find a pattern<br /> worth trying.</h1>
    <p>Explore practical patterns, concepts, and practices. Keep what works close.</p>
    <form class="search" id="search" role="search" onsubmit={submitSearch}>
      <div class="search-row">
        <input
          id="knowledge-search"
          name="q"
          type="search"
          aria-label="Search Patternverse"
          placeholder="Search by title, idea, or keyword"
          bind:value={libraryQuery}
        />
        <button type="submit">Search</button>
      </div>
    </form>
  </section>

  <WorkspaceLibrary
    commons={data.entities}
    commonsSearchDocuments={data.searchDocuments}
    bind:query={libraryQuery}
  />

  <section class="verses" aria-labelledby="verses-heading">
    <div class="section-heading">
      <p>Broad lenses</p>
      <h2 id="verses-heading">Verses</h2>
    </div>
    <div class="verse-list" id="verse-grid">
      {#each visibleVerses as verse (`${verse.sourceId}:${verse.id}`)}
        <article class={verseAccentClass(verse.id)}>
          <a
            class="verse-tile"
            href={resolve('/[type=entityType]/[id]', { type: verse.type, id: verse.id })}
          >
            <h3>{verse.title}</h3>
            <p>{verse.summary}</p>
            <span class="verse-note">Patternverse Commons</span>
          </a>
        </article>
      {/each}
    </div>
    {#if hiddenVerseCount > 0}
      <div class="verse-disclosure">
        <button
          type="button"
          aria-controls="verse-grid"
          aria-expanded={versesExpanded}
          onclick={() => (versesExpanded = !versesExpanded)}
        >
          {versesExpanded ? 'Show fewer Verses' : `Show all ${data.verses.length} Verses`}
        </button>
        {#if !versesExpanded}<span>{hiddenVerseCount} more</span>{/if}
      </div>
    {/if}
  </section>
</main>

<script lang="ts">
  import { resolve } from '$app/paths';
  import PatternverseGuide from '$lib/components/PatternverseGuide.svelte';
  import HeroTileArtwork from '$lib/illustrations/HeroTileArtwork.svelte';
  import { verseAccentClass } from '$lib/verse-accent';

  let { data } = $props();

  const VERSE_PREVIEW_LIMIT = 16;
  let versesExpanded = $state(false);
  let visibleVerses = $derived(
    versesExpanded ? data.verses : data.verses.slice(0, VERSE_PREVIEW_LIMIT),
  );
  let hiddenVerseCount = $derived(Math.max(0, data.verses.length - VERSE_PREVIEW_LIMIT));
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
    <div class="hero-inner">
      <div class="hero-stage">
        <div class="hero-art" aria-hidden="true">
          <HeroTileArtwork />
        </div>
        <div class="hero-copy">
          <div class="eyebrow">Patternverse / procedural knowledge library</div>
          <h1 id="hero-heading">Ideas worth<br /> putting<br /> to work.</h1>
          <p>
            A curated library of patterns, concepts, and practices for turning useful ideas into
            action.
          </p>
          <div class="hero-actions">
            <a class="primary" href={resolve('/library')}>Browse the library <span>↗</span></a>
            <a href="#home-about">What is the Patternverse? <span>→</span></a>
          </div>
        </div>
      </div>
    </div>
  </section>

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
            <span class="verse-note">Patternverse commons</span>
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

  <PatternverseGuide />
</main>

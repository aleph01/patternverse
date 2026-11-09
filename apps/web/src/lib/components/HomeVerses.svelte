<script lang="ts">
  import { resolve } from '$app/paths';
  import { verseAccentClass } from '$lib/verse-accent';
  import { groupVersesByArea } from '$lib/verse-areas';
  import VerseAreaFilters from './VerseAreaFilters.svelte';
  import VerseAreaDivider from './VerseAreaDivider.svelte';

  let {
    verses,
  }: {
    verses: readonly { sourceId: string; id: string; title: string; summary: string }[];
  } = $props();
  let selectedArea = $state('all');
  const groups = $derived(groupVersesByArea(verses));
  const visibleGroups = $derived(
    groups.filter((group) => selectedArea === 'all' || group.area.id === selectedArea),
  );
  $effect(() => {
    if (selectedArea !== 'all' && !groups.some((group) => group.area.id === selectedArea)) {
      selectedArea = 'all';
    }
  });
</script>

<section class="home-verses" id="home-verses" aria-labelledby="home-verses-heading">
  <div class="verse-heading">
    <div>
      <p class="eyebrow">Broad lenses</p>
      <h2 id="home-verses-heading">Verses</h2>
    </div>
  </div>
  <VerseAreaFilters areas={groups.map((group) => group.area)} bind:value={selectedArea} />
  {#each visibleGroups as group (group.area.id)}
    <section class="home-verse-area" aria-labelledby={`home-area-${group.area.id}`}>
      <VerseAreaDivider id={`home-area-${group.area.id}`} title={group.area.title} />
      <div class="verse-list home-verse-grid">
        {#each Array.from( { length: Math.ceil(group.verses.length / 3) }, (_, index) => group.verses.slice(index * 3, index * 3 + 3) ) as row, index (index)}
          <div class="verse-row" class:single-verse={row.length === 1}>
            {#each row as verse (`${verse.sourceId}:${verse.id}`)}
              <article class="home-verse-card {verseAccentClass(verse.id)}">
                <a
                  class="verse-tile"
                  href={resolve(
                    `/library?verse=${encodeURIComponent(`${verse.sourceId}:${verse.id}`)}`,
                  )}
                  aria-labelledby={`home-verse-${verse.id}-title`}
                  aria-describedby={`home-verse-${verse.id}-summary`}
                >
                  <span class="verse-arrow" aria-hidden="true">↗</span>
                  <div class="verse-copy">
                    <h4 id={`home-verse-${verse.id}-title`}>{verse.title}</h4>
                    <div class="verse-details">
                      <div>
                        <p id={`home-verse-${verse.id}-summary`}>{verse.summary}</p>
                        <span class="verse-action" aria-hidden="true">Explore verse</span>
                      </div>
                    </div>
                  </div>
                </a>
              </article>
            {/each}
          </div>
        {/each}
      </div>
    </section>
  {/each}
</section>

<style>
  .home-verses {
    padding: clamp(2.5rem, 5vw, 5rem) max(3vw, calc((100vw - 1440px) / 2));
    border-bottom: 1px solid var(--ink);
    scroll-margin-top: 1.5rem;
  }
  .verse-heading {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 1.75rem;
  }
  .eyebrow {
    margin: 0 0 0.65rem;
    color: var(--green-dark);
    font-size: 0.78rem;
    font-weight: 750;
  }
  h2 {
    margin: 0;
    font-size: clamp(2rem, 3.4vw, 3.25rem);
    font-weight: 850;
    line-height: 1.08;
    letter-spacing: -0.055em;
    text-transform: lowercase;
  }
  .verse-list.home-verse-grid {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0;
    padding: 0;
    isolation: isolate;
  }
  .verse-row {
    display: flex;
    height: clamp(300px, 22vw, 340px);
  }
  .verse-row.single-verse .home-verse-card {
    flex: 0 1 33.333%;
    transition: flex-basis 360ms cubic-bezier(0.22, 1, 0.36, 1);
  }
  .verse-row.single-verse .home-verse-card:focus-within {
    flex-grow: 0;
    flex-basis: 66.666%;
  }
  .home-verse-grid .home-verse-card {
    flex: 1;
    min-width: 0;
    min-height: 0;
    border: 0;
    border-radius: 0;
    box-shadow: none;
    overflow: hidden;
    transition:
      flex-grow 360ms cubic-bezier(0.22, 1, 0.36, 1),
      color 180ms ease,
      background-color 180ms ease;
  }
  .home-verse-card .verse-tile {
    height: 100%;
    min-height: 0;
    justify-content: space-between;
    gap: 1rem;
    padding: clamp(1.25rem, 2vw, 2rem);
  }
  .verse-arrow {
    align-self: flex-end;
    font-size: 1.75rem;
    line-height: 1;
    opacity: 0;
    visibility: hidden;
    transition:
      transform 240ms ease,
      opacity 200ms ease,
      visibility 200ms;
  }
  .verse-copy {
    min-width: 0;
  }
  .home-verse-card h4 {
    max-width: 13ch;
    margin: 0;
    font-size: clamp(1.35rem, 2vw, 2rem);
    font-weight: 750;
    line-height: 1.02;
    letter-spacing: -0.045em;
    text-transform: lowercase;
    overflow-wrap: normal;
    text-wrap: balance;
  }
  .verse-details {
    display: grid;
    grid-template-rows: 0fr;
    opacity: 0;
    visibility: hidden;
    transition:
      grid-template-rows 360ms cubic-bezier(0.22, 1, 0.36, 1),
      opacity 200ms ease,
      visibility 200ms;
  }
  .verse-details > div {
    min-height: 0;
    overflow: hidden;
  }
  .home-verse-card .verse-details p {
    max-width: 42ch;
    margin: 1rem 0 1.25rem;
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .verse-action {
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: lowercase;
  }
  .home-verse-card:focus-within .verse-details {
    grid-template-rows: 1fr;
    opacity: 1;
    visibility: visible;
  }
  .home-verse-card:focus-within .verse-arrow {
    opacity: 1;
    visibility: visible;
    transform: translate(3px, -3px);
  }
  .home-verse-grid .home-verse-card:focus-within {
    flex-grow: 1.75;
  }
  @media (hover: hover) and (pointer: fine) {
    .home-verse-grid .home-verse-card:hover {
      flex-grow: 1.75;
    }
    .verse-row.single-verse .home-verse-card:hover {
      flex-grow: 0;
      flex-basis: 66.666%;
    }
    .home-verse-card:hover .verse-details {
      grid-template-rows: 1fr;
      opacity: 1;
      visibility: visible;
    }
    .home-verse-card:hover .verse-arrow {
      opacity: 1;
      visibility: visible;
      transform: translate(3px, -3px);
    }
  }
  @media (max-width: 1024px), (hover: none) and (pointer: coarse) {
    .home-verses {
      padding: 2.5rem 24px;
    }
    .verse-heading {
      display: block;
    }
    .verse-list.home-verse-grid {
      display: grid;
      height: auto;
      grid-template-columns: none;
      grid-template-rows: none;
      grid-auto-flow: column;
      grid-auto-columns: min(78vw, 340px);
      padding-bottom: 0.75rem;
      overflow-x: auto;
      overscroll-behavior-x: contain;
      scroll-snap-type: x mandatory;
      scrollbar-width: thin;
      scrollbar-color: var(--ink) transparent;
    }
    .verse-row {
      display: contents;
    }
    .home-verse-card {
      scroll-snap-align: start;
    }
    .home-verse-card .verse-tile {
      min-height: 340px;
    }
    .home-verse-card h4 {
      font-size: 1.65rem;
    }
    .verse-details {
      grid-template-rows: 1fr;
      opacity: 1;
      visibility: visible;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .verse-row,
    .home-verse-grid .home-verse-card,
    .verse-details,
    .verse-arrow {
      transition: none;
    }
  }
</style>

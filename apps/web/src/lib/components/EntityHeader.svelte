<script lang="ts">
  import { resolve } from '$app/paths';
  import type { CompiledEntity } from '@patternverse/compiler';
  import type { EntitySummary } from '$lib/server/commons';
  import SaveToLibrary from './SaveToLibrary.svelte';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import { patternIconForPattern } from '$lib/illustrations/pattern-mark-presets';
  import PatternShareButton from '$lib/sharing/PatternShareButton.svelte';
  import type { PatternShare } from '$lib/sharing/types';

  let {
    entity,
    verses,
    practiceHref,
    compact = false,
    typeLabel,
    share,
  }: {
    entity: CompiledEntity;
    verses: readonly EntitySummary[];
    practiceHref?: string;
    compact?: boolean;
    typeLabel?: string;
    share?: PatternShare | null;
  } = $props();
</script>

<header
  class="entity-hero"
  class:reader-header={compact}
  id={compact ? 'article-overview' : undefined}
>
  {#if practiceHref}
    <!-- eslint-disable svelte/no-navigation-without-resolve -- practiceHref is resolved by the page loader. -->
    <a class="entity-practice-shortcut" href={practiceHref}
      >try this practice <span aria-hidden="true">→</span></a
    >
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {/if}
  <div class="entity-header-top">
    <div class="entity-kicker">
      <span>{typeLabel ?? entity.type}</span>
      <span aria-hidden="true">·</span>
      <span>Commons</span>
      {#if entity.status === 'draft'}
        <strong class="draft-label">Draft</strong>
      {/if}
    </div>
    <div class="header-actions">
      {#if share}{#key `${entity.sourceId}:${entity.id}`}<PatternShareButton {share} />{/key}{/if}
      {#if entity.type === 'pattern' || entity.type === 'collection'}
        <SaveToLibrary sourceId={entity.sourceId} entityId={entity.id} />
      {/if}
    </div>
  </div>
  <div class="entity-title-row">
    <h1>{entity.title}</h1>
    {#if entity.type === 'pattern'}
      <span class="entity-pattern-icon" aria-hidden="true"
        ><PatternIcon icon={patternIconForPattern(entity.id, entity.title)} decorative /></span
      >
    {/if}
  </div>
  {#if entity.summary}<p class="entity-summary">{entity.summary}</p>{/if}
  {#if verses.length > 0}
    <nav class="verse-links" aria-label="Verses">
      {#each verses as verse (`${verse.sourceId}:${verse.id}`)}
        <a href={resolve('/[type=entityType]/[id]', { type: verse.type, id: verse.id })}
          >{verse.title}</a
        >
      {/each}
    </nav>
  {/if}
</header>

<style>
  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }
  .entity-hero.reader-header {
    grid-area: header;
    min-height: 0;
    padding: 0 0 1.75rem;
    scroll-margin-top: 1.5rem;
  }
  .reader-header .entity-header-top {
    margin-bottom: 1.25rem;
  }
  .reader-header .entity-title-row {
    gap: 1.25rem;
  }
  .reader-header h1 {
    max-width: 24ch;
    font-size: clamp(2.25rem, 4.2vw, 3.5rem);
    line-height: 1.04;
    letter-spacing: -0.055em;
    overflow-wrap: anywhere;
  }
  .reader-header .entity-summary {
    max-width: 52ch;
    margin-top: 1rem;
    font-size: clamp(1.1rem, 1.6vw, 1.25rem);
    line-height: 1.45;
  }
  .reader-header .verse-links {
    margin-top: 1.25rem;
  }
  .reader-header .entity-pattern-icon {
    width: 44px;
    height: 44px;
    flex-basis: 44px;
  }
  .entity-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: clamp(2.5rem, 7vh, 6rem);
  }
  .entity-header-top .entity-kicker {
    flex-wrap: wrap;
    min-width: 0;
    margin-bottom: 0;
  }
  .entity-title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 2rem;
  }
  .entity-title-row h1 {
    min-width: 0;
  }
  .entity-pattern-icon {
    display: block;
    width: 72px;
    height: 72px;
    flex: 0 0 72px;
  }
  @media (max-width: 768px) {
    .entity-pattern-icon {
      display: none;
    }
  }
</style>

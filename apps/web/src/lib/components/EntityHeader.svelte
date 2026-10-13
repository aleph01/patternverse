<script lang="ts">
  import { resolve } from '$app/paths';
  import type { CompiledEntity } from '@patternverse/compiler';
  import type { EntitySummary } from '$lib/server/commons';
  import SaveToLibrary from './SaveToLibrary.svelte';
  import PatternIcon from '$lib/illustrations/PatternIcon.svelte';
  import { patternIconForPattern } from '$lib/illustrations/pattern-mark-presets';

  let {
    entity,
    verses,
    practiceHref,
  }: {
    entity: CompiledEntity;
    verses: readonly EntitySummary[];
    practiceHref?: string;
  } = $props();
</script>

<header class="entity-hero">
  {#if practiceHref}
    <!-- eslint-disable svelte/no-navigation-without-resolve -- practiceHref is resolved by the page loader. -->
    <a class="entity-practice-shortcut" href={practiceHref}
      >try this practice <span aria-hidden="true">→</span></a
    >
    <!-- eslint-enable svelte/no-navigation-without-resolve -->
  {/if}
  <div class="entity-header-top">
    <div class="entity-kicker">
      <span>{entity.type}</span>
      <span aria-hidden="true">·</span>
      <span>Patternverse commons</span>
      {#if entity.status === 'draft'}
        <strong class="draft-label">Draft</strong>
      {/if}
    </div>
    {#if entity.type === 'pattern' || entity.type === 'collection'}
      <SaveToLibrary sourceId={entity.sourceId} entityId={entity.id} />
    {/if}
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

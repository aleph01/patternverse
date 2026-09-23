<script lang="ts">
  import { resolve } from '$app/paths';
  import type { CompiledEntity } from '@patternverse/compiler';
  import type { EntitySummary } from '$lib/server/commons';

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
    <a class="entity-practice-shortcut" href={practiceHref}
      >try this practice <span aria-hidden="true">→</span></a
    >
  {/if}
  <div class="entity-kicker">
    <span>{entity.type}</span>
    <span aria-hidden="true">·</span>
    <span>Patternverse Commons</span>
    {#if entity.status === 'draft'}
      <strong class="draft-label">Draft</strong>
    {/if}
  </div>
  <h1>{entity.title}</h1>
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

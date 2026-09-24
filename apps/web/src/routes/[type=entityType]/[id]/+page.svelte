<script lang="ts">
  import { resolve } from '$app/paths';
  import EntityHeader from '$lib/components/EntityHeader.svelte';
  import EntityList from '$lib/components/EntityList.svelte';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import UnifiedVerseGroups from '$lib/components/UnifiedVerseGroups.svelte';
  import UsefulnessControl from '$lib/components/UsefulnessControl.svelte';
  import { miraPatternQuery } from '$lib/mira/context';
  import { verseAccentClass } from '$lib/verse-accent';

  let { data } = $props();
</script>

<svelte:head>
  <title>{data.entity.title} — Patternverse</title>
  <meta
    name="description"
    content={data.entity.summary ?? `${data.entity.title} on Patternverse Commons.`}
  />
</svelte:head>

<main
  class:verse-page={data.entity.type === 'verse'}
  class:collection-page={data.entity.type === 'collection'}
  class={`entity-page ${data.entity.type === 'verse' ? verseAccentClass(data.entity.id) : ''}`}
>
  <EntityHeader
    entity={data.entity}
    verses={data.relationships.verseMemberships}
    practiceHref={data.entity.type === 'pattern' && data.entity.practice
      ? resolve(`/pattern/${data.entity.id}/practice`)
      : undefined}
  />

  {#if data.renderedBody}
    <article class="entity-article" aria-label={`${data.entity.title} article`}>
      <MarkdownRenderer html={data.renderedBody} />
    </article>
  {/if}

  {#if data.entity.type === 'pattern' && data.entity.practice}
    <aside class="practice-cta" aria-labelledby="practice-cta-heading">
      <div>
        <p>Interactive Practice</p>
        <h2 id="practice-cta-heading">put this pattern into practice.</h2>
      </div>
      <a href={resolve(`/pattern/${data.entity.id}/practice`)}>Begin Practice</a>
    </aside>
  {/if}

  {#if data.entity.type === 'pattern'}
    <aside class="mira-pattern-cta" aria-labelledby="mira-pattern-heading">
      <div>
        <p>With Mira</p>
        <h2 id="mira-pattern-heading">A place for this pattern in Mira.</h2>
      </div>
      <!-- eslint-disable svelte/no-navigation-without-resolve -- The base route is resolved before adding source-qualified query parameters. -->
      <a
        href={`${resolve('/mira')}${miraPatternQuery({ sourceId: data.entity.sourceId, entityId: data.entity.id })}`}
      >
        Preview Mira <span aria-hidden="true">↗</span>
      </a>
      <!-- eslint-enable svelte/no-navigation-without-resolve -->
    </aside>
  {/if}

  {#if data.entity.type === 'practice' && data.entity.practice}
    <aside class="practice-note">
      <span>Structured Practice</span>
      <p>This article includes a declarative interactive Practice.</p>
    </aside>
  {/if}

  {#if data.entity.type === 'pattern' || data.entity.type === 'concept'}
    <section class="personal-state" aria-labelledby="usefulness-heading">
      <div>
        <p>Personal note</p>
        <h2 id="usefulness-heading">was this useful to you?</h2>
      </div>
      <UsefulnessControl sourceId={data.entity.sourceId} entityId={data.entity.id} />
    </section>
  {/if}

  {#if data.entity.type === 'collection'}
    <section class="primary-relationship" aria-labelledby="collection-items-heading">
      <div class="relationship-heading">
        <p>Curated selection</p>
        <h2 id="collection-items-heading">In this Collection</h2>
        <span>{data.relationships.collectionItems.length} entries · Author-defined order</span>
      </div>
      <EntityList items={data.relationships.collectionItems} />
    </section>
  {:else if data.entity.type === 'verse'}
    <UnifiedVerseGroups verseId={data.entity.id} commonsMembers={data.relationships.verseMembers} />
  {/if}

  <div class="relationship-grid">
    {#if data.relationships.implementedByPractices.length > 0}
      <section aria-labelledby="practices-heading">
        <p class="relationship-label">Put it into practice</p>
        <h2 id="practices-heading">Practices</h2>
        <EntityList items={data.relationships.implementedByPractices} compact />
      </section>
    {/if}

    {#if data.relationships.implementsPatterns.length > 0}
      <section aria-labelledby="implements-heading">
        <p class="relationship-label">Underlying approach</p>
        <h2 id="implements-heading">Implements</h2>
        <EntityList items={data.relationships.implementsPatterns} compact />
      </section>
    {/if}

    {#if data.relationships.collectionMemberships.length > 0}
      <section aria-labelledby="collections-heading">
        <p class="relationship-label">Curated context</p>
        <h2 id="collections-heading">Appears in</h2>
        <EntityList items={data.relationships.collectionMemberships} compact />
      </section>
    {/if}

    {#if data.relationships.backlinks.length > 0}
      <section aria-labelledby="backlinks-heading">
        <p class="relationship-label">Connections</p>
        <h2 id="backlinks-heading">Linked from</h2>
        <EntityList items={data.relationships.backlinks} compact />
      </section>
    {/if}
  </div>
</main>

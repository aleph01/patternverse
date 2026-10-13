<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import PatternArticleActions from '$lib/components/PatternArticleActions.svelte';
  import WorksheetButton from '$lib/components/WorksheetButton.svelte';
  import type { WorksheetDefinition } from '$lib/worksheet/export';
  import { hasStandaloneSourcePractice } from '$lib/pattern-run/source-practice';
  import EntityHeader from '$lib/components/EntityHeader.svelte';
  import EntityList from '$lib/components/EntityList.svelte';
  import PaginatedEntityList from '$lib/components/PaginatedEntityList.svelte';
  import LibraryViewSwitch from '$lib/components/LibraryViewSwitch.svelte';
  import type { LibraryPreferences } from '$lib/client/library-preferences';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import UnifiedVerseGroups from '$lib/components/UnifiedVerseGroups.svelte';
  import UsefulnessControl from '$lib/components/UsefulnessControl.svelte';
  import { miraPatternQuery } from '$lib/mira/context';
  import { THERAPY_LIBRARY } from '$lib/mira/therapy-library';
  import { REFRAMING_LIBRARY } from '$lib/pattern-run/reframing-library';
  import { patternAiReason } from '$lib/pattern-run/ai-reason';
  import { entityPageAccentClass } from '$lib/verse-accent';
  import { canRunStandalonePattern, resolveReleaseFeatures } from '$lib/release-features';

  let { data } = $props();
  let desktop = $state(false);
  let collectionLayout = $state<LibraryPreferences['layout']>('cards');
  const features = $derived(resolveReleaseFeatures(desktop));
  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
  });
  const therapyTechnique = $derived(THERAPY_LIBRARY.find((t) => t.slug === data.entity.id));
  const runnablePattern = $derived(
    [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].find((item) => item.slug === data.entity.id),
  );
  const needsAi = $derived(
    Boolean(runnablePattern && 'needsAi' in runnablePattern && runnablePattern.needsAi),
  );
  const canTry = $derived(canRunStandalonePattern(features, data.isTherapyEntry, needsAi));
  const tryHref = $derived(
    data.entity.type !== 'pattern' || !canTry
      ? undefined
      : runnablePattern || hasStandaloneSourcePractice(data.entity)
        ? resolve(`/pattern/${data.entity.id}/run`)
        : data.entity.practice
          ? resolve(`/pattern/${data.entity.id}/practice`)
          : data.runnablePracticeId
            ? resolve(`/practice/${data.runnablePracticeId}/run`)
            : undefined,
  );
  const hasPracticeAction = $derived(Boolean(tryHref || (runnablePattern && needsAi)));
  const worksheetDefinition = $derived<WorksheetDefinition | undefined>(
    data.worksheetSource
      ? { source: data.worksheetSource }
      : runnablePattern
        ? { techniqueId: runnablePattern.id }
        : undefined,
  );
  const miraHref = $derived(
    data.entity.type === 'pattern' && data.isTherapyEntry
      ? therapyTechnique && features.guidedExercises
        ? `${resolve('/apps/mira')}?technique=${therapyTechnique.id}`
        : `${resolve('/mira')}${miraPatternQuery({ sourceId: data.entity.sourceId, entityId: data.entity.id })}`
      : undefined,
  );
  const practiceDescription = $derived(
    hasPracticeAction
      ? runnablePattern && needsAi
        ? `${patternAiReason(runnablePattern.id)} ${canTry ? 'An OpenRouter connection is needed on the web.' : 'AI-guided runs are not available in this release.'}`
        : 'A short, structured reflection. No AI needed. Your answers are not saved when you leave.'
      : '',
  );
</script>

<svelte:head>
  <title>{data.entity.title} — Patternverse</title>
  <meta
    name="description"
    content={data.entity.summary ?? `${data.entity.title} on Patternverse commons.`}
  />
</svelte:head>

<main
  class:verse-page={data.entity.type === 'verse'}
  class:collection-page={data.entity.type === 'collection'}
  class={`entity-page ${entityPageAccentClass(data.entity)}`}
>
  {#if data.entity.type === 'pattern' && (tryHref || miraHref || worksheetDefinition || data.collectionOverviews.length)}
    <PatternArticleActions
      title={data.entity.title}
      {tryHref}
      {miraHref}
      description={practiceDescription}
      {worksheetDefinition}
      article={data.entity.ref}
      collectionOverviews={data.collectionOverviews}
      compact
    />
  {/if}

  <EntityHeader entity={data.entity} verses={data.relationships.verseMemberships} />

  {#if data.renderedBody}
    <article class="entity-article" aria-label={`${data.entity.title} article`}>
      <MarkdownRenderer html={data.renderedBody} />
    </article>
  {/if}

  {#if data.entity.type === 'pattern' && (hasPracticeAction || miraHref || worksheetDefinition)}
    <PatternArticleActions
      title={data.entity.title}
      {tryHref}
      {miraHref}
      description={practiceDescription}
      {worksheetDefinition}
    />
  {/if}

  {#if data.entity.type === 'practice' && data.entity.languagePracticeSource}
    <aside class="practice-note">
      <span>Structured Practice</span>
      <p>This article includes a declarative interactive Practice.</p>
      {#if canTry}<a href={resolve(`/practice/${data.entity.id}/run`)}>Begin practice →</a>{/if}
      {#if worksheetDefinition}<WorksheetButton definition={worksheetDefinition} />{/if}
    </aside>
  {/if}

  {#if data.entity.type === 'collection'}
    <section class="primary-relationship" aria-labelledby="collection-items-heading">
      <div class="relationship-heading collection-items-header">
        <div class="collection-items-title">
          <p>Curated selection</p>
          <h2 id="collection-items-heading">In this Collection</h2>
          <span>{data.relationships.collectionItems.length} entries · Author-defined order</span>
        </div>
        <LibraryViewSwitch bind:layout={collectionLayout} label="Collection view" mobileVisible />
      </div>
      <div class="collection-entries">
        {#key `${data.entity.sourceId}:${data.entity.id}`}
          <PaginatedEntityList
            items={data.relationships.collectionItems}
            layout={collectionLayout}
            cardsOnMobile
            label="Collection entries"
            collectionContext={data.entity}
          />
        {/key}
      </div>
    </section>
  {:else if data.entity.type === 'verse'}
    <UnifiedVerseGroups verseId={data.entity.id} commonsMembers={data.relationships.verseMembers} />
  {/if}

  {#if data.entity.type === 'pattern' || data.entity.type === 'concept' || data.relationships.implementedByPractices.length > 0 || data.relationships.implementsPatterns.length > 0 || data.relationships.collectionMemberships.length > 0 || data.relationships.backlinks.length > 0}
    <aside class="entity-meta-panel" aria-label="Personal and related information">
      {#if data.entity.type === 'pattern' || data.entity.type === 'concept'}
        <section class="personal-state compact-meta-section" aria-labelledby="usefulness-heading">
          <div class="compact-meta-heading">
            <span class="compact-meta-index" aria-hidden="true"></span>
            <h2 id="usefulness-heading">was this useful for you?</h2>
          </div>
          <UsefulnessControl sourceId={data.entity.sourceId} entityId={data.entity.id} compact />
        </section>
      {/if}

      <div class="relationship-grid">
        {#if data.relationships.implementedByPractices.length > 0}
          <section class="compact-meta-section" aria-labelledby="practices-heading">
            <header class="compact-relationship-heading">
              <div>
                <span class="compact-meta-index" aria-hidden="true"></span>
                <h2 id="practices-heading">Practices</h2>
              </div>
              <span>{data.relationships.implementedByPractices.length}</span>
            </header>
            <EntityList items={data.relationships.implementedByPractices} compact />
          </section>
        {/if}

        {#if data.relationships.implementsPatterns.length > 0}
          <section class="compact-meta-section" aria-labelledby="implements-heading">
            <header class="compact-relationship-heading">
              <div>
                <span class="compact-meta-index" aria-hidden="true"></span>
                <h2 id="implements-heading">Implements</h2>
              </div>
              <span>{data.relationships.implementsPatterns.length}</span>
            </header>
            <EntityList items={data.relationships.implementsPatterns} compact />
          </section>
        {/if}

        {#if data.relationships.collectionMemberships.length > 0}
          <section class="compact-meta-section" aria-labelledby="collections-heading">
            <header class="compact-relationship-heading">
              <div>
                <span class="compact-meta-index" aria-hidden="true"></span>
                <h2 id="collections-heading">Appears in</h2>
              </div>
              <span>{data.relationships.collectionMemberships.length}</span>
            </header>
            <EntityList items={data.relationships.collectionMemberships} compact />
          </section>
        {/if}

        {#if data.relationships.backlinks.length > 0}
          <section class="compact-meta-section" aria-labelledby="backlinks-heading">
            <header class="compact-relationship-heading">
              <div>
                <span class="compact-meta-index" aria-hidden="true"></span>
                <h2 id="backlinks-heading">Linked by</h2>
              </div>
              <span>{data.relationships.backlinks.length}</span>
            </header>
            <EntityList items={data.relationships.backlinks} compact />
          </section>
        {/if}
      </div>
    </aside>
  {/if}
</main>

<style>
  .collection-items-header {
    grid-template-columns: minmax(0, 1fr) auto;
    margin-bottom: 2rem;
  }
  .collection-items-title {
    display: grid;
    gap: 0.8rem;
  }
  .collection-items-title p {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 850;
    letter-spacing: 0.1em;
    text-transform: lowercase;
  }
  .collection-items-title span {
    font-size: 0.72rem;
    font-weight: 750;
    text-transform: lowercase;
  }
  .collection-entries {
    container-type: inline-size;
  }
  @media (max-width: 800px) {
    .collection-items-header {
      grid-template-columns: minmax(0, 1fr);
      justify-items: start;
      gap: 1.25rem;
    }
  }
</style>

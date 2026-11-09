<script lang="ts">
  import { onMount } from 'svelte';
  import { resolve } from '$app/paths';
  import PatternArticleActions from '$lib/components/PatternArticleActions.svelte';
  import WorksheetButton from '$lib/components/WorksheetButton.svelte';
  import type { WorksheetDefinition } from '$lib/worksheet/export';
  import {
    hasStandaloneSourcePractice,
    sourcePracticeNeedsAi,
  } from '$lib/pattern-run/source-practice';
  import EntityHeader from '$lib/components/EntityHeader.svelte';
  import ArticleBreadcrumbs from '$lib/components/ArticleBreadcrumbs.svelte';
  import ArticleOutline from '$lib/components/ArticleOutline.svelte';
  import ArticleReaderNavigation from '$lib/components/ArticleReaderNavigation.svelte';
  import { hasArticleOutline } from '$lib/article-sections';
  import EntityList from '$lib/components/EntityList.svelte';
  import BacklinksPanel from '$lib/components/BacklinksPanel.svelte';
  import PaginatedEntityList from '$lib/components/PaginatedEntityList.svelte';
  import LibraryViewSwitch from '$lib/components/LibraryViewSwitch.svelte';
  import type { LibraryPreferences } from '$lib/client/library-preferences';
  import ArticleContributionLink from '$lib/components/ArticleContributionLink.svelte';
  import MarkdownRenderer from '$lib/components/MarkdownRenderer.svelte';
  import UsefulnessControl from '$lib/components/UsefulnessControl.svelte';
  import { miraPatternQuery } from '$lib/mira/context';
  import { THERAPY_LIBRARY } from '$lib/mira/therapy-library';
  import { REFRAMING_LIBRARY } from '$lib/pattern-run/reframing-library';
  import { patternAiReason } from '$lib/pattern-run/ai-reason';
  import { entityPageAccentClass } from '$lib/verse-accent';
  import { canRunStandalonePattern, resolveReleaseFeatures } from '$lib/release-features';
  import type { PracticeAction } from '$lib/practice-options';
  import MusicPlayer from '$lib/music/MusicPlayer.svelte';
  import GuidedMusicLesson from '$lib/music/GuidedMusicLesson.svelte';
  import ChordEditor from '$lib/music/ChordEditor.svelte';
  import { exampleForChapter } from '$lib/music/examples';
  import ListeningStudies from '$lib/music/ListeningStudies.svelte';
  import { studiesForArticle } from '$lib/music/listening';

  let { data } = $props();
  let desktop = $state(false);
  let collectionLayout = $state<LibraryPreferences['layout']>('cards');
  let tabletCollection = $state(false);
  const features = $derived(resolveReleaseFeatures(desktop));
  const reader = $derived(data.entity.type !== 'collection');
  const readerNavigation = $derived(
    reader &&
      Boolean(data.articleSections.length || data.breadcrumbContext.navigation.collections.length),
  );
  const canContribute = $derived(
    Boolean(data.renderedBody) && data.entity.status === 'published' && !desktop,
  );
  const musicalExample = $derived(
    data.entity.sourceId === 'commons' ? exampleForChapter(data.entity.id) : undefined,
  );
  const listeningStudies = $derived(
    data.entity.sourceId === 'commons' ? studiesForArticle(data.entity.id) : [],
  );
  const chordEditor = $derived(
    data.entity.sourceId === 'commons' &&
      [
        'songwriting-course',
        'songwriting-example-songbook',
        'songwriting-chord-families-and-numbers',
      ].includes(data.entity.id),
  );
  const outline = $derived(reader && hasArticleOutline(data.articleSections));
  onMount(() => {
    desktop = '__TAURI_INTERNALS__' in window;
    const tablet = window.matchMedia('(min-width: 601px) and (max-width: 1100px)');
    const updateTablet = () => (tabletCollection = tablet.matches);
    updateTablet();
    tablet.addEventListener('change', updateTablet);
    return () => tablet.removeEventListener('change', updateTablet);
  });
  const therapyTechnique = $derived(THERAPY_LIBRARY.find((t) => t.slug === data.entity.id));
  const runnablePattern = $derived(
    [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].find((item) => item.slug === data.entity.id),
  );
  const needsAi = $derived(
    sourcePracticeNeedsAi(data.entity) ||
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
      ? needsAi
        ? `${patternAiReason(runnablePattern?.id ?? data.entity.id)} ${canTry ? 'Uses the existing AI connection; responses stay unsaved unless you choose to save them.' : 'AI-guided runs are not available in this release.'}`
        : 'A short, structured reflection. No AI needed. Your answers are not saved when you leave.'
      : '',
  );
  const practices = $derived<readonly PracticeAction[]>(
    data.practices.map((practice) => ({
      ...practice,
      tryHref:
        practice.runPath && canRunStandalonePattern(features, practice.isTherapy, practice.needsAi)
          ? resolve(practice.runPath)
          : undefined,
      miraHref: miraHref
        ? `${resolve('/mira')}${miraPatternQuery({ sourceId: practice.ref.sourceId, entityId: practice.ref.entityId })}`
        : undefined,
    })),
  );
</script>

{#snippet breadcrumbs()}
  <ArticleBreadcrumbs context={data.breadcrumbContext} />
{/snippet}

<svelte:head>
  <title>{data.entity.title} — Patternverse</title>
  <meta name="description" content={data.entity.summary ?? `${data.entity.title} on Commons.`} />
</svelte:head>

<main
  class:collection-page={data.entity.type === 'collection'}
  class:reader-page={reader}
  class:has-reader-navigation={readerNavigation}
  class={`entity-page ${entityPageAccentClass(data.entity)}`}
>
  {#if readerNavigation}
    {#key `${data.entity.sourceId}:${data.entity.id}`}
      <ArticleReaderNavigation context={data.breadcrumbContext} sections={data.articleSections} />
    {/key}
  {/if}
  <div class="article-top-navigation">
    {#if data.entity.type === 'pattern'}
      <PatternArticleActions
        title={data.entity.title}
        {tryHref}
        {miraHref}
        description={practiceDescription}
        {worksheetDefinition}
        {practices}
        article={data.entity.ref}
        collectionOverviews={data.collectionOverviews}
        navigation={breadcrumbs}
        compact
      />
    {:else}
      <div class="entity-breadcrumb-row">{@render breadcrumbs()}</div>
    {/if}
  </div>

  <div class:article-reader={reader} class:has-outline={outline}>
    <EntityHeader
      entity={data.entity}
      share={data.share}
      typeLabel={data.musicLesson?.articleId === 'songwriting-pitch-and-intervals'
        ? 'Foundation'
        : undefined}
      verses={data.relationships.verseMemberships}
      compact={reader}
    />
    {#if outline}
      {#key `${data.entity.sourceId}:${data.entity.id}`}
        <ArticleOutline sections={data.articleSections} />
      {/key}
    {/if}
    {#if data.renderedBody}
      <article
        class="entity-article"
        class:visual-lesson={data.entity.sourceId === 'commons' &&
          data.entity.id.startsWith('dataviz-')}
        aria-label={`${data.entity.title} article`}
      >
        {#key `${data.entity.sourceId}:${data.entity.id}`}
          {#if data.musicLesson}<GuidedMusicLesson lesson={data.musicLesson} />
          {:else if musicalExample}<MusicPlayer
              initial={musicalExample}
              showSelector={musicalExample !== 'form-layered-entry'}
              showPartControls={musicalExample !== 'form-layered-entry'}
              allowEditing={musicalExample !== 'form-layered-entry'}
            />{/if}
          {#if chordEditor}<ChordEditor
              expanded={data.entity.id === 'songwriting-chord-families-and-numbers'}
            />{/if}
          {#if data.musicLesson}
            <details class="recording-context">
              <summary>Original recording & listening context</summary>
              <ListeningStudies studies={listeningStudies} />
            </details>
          {:else}
            <ListeningStudies
              studies={listeningStudies}
              guide={data.entity.id === 'songwriting-listening-guide'}
            />
          {/if}
          <MarkdownRenderer html={data.renderedBody} />
        {/key}
      </article>
    {/if}
  </div>

  {#if data.entity.type === 'pattern' && (practices.length > 1 || hasPracticeAction || miraHref || worksheetDefinition)}
    <PatternArticleActions
      title={data.entity.title}
      {tryHref}
      {miraHref}
      description={practiceDescription}
      {worksheetDefinition}
      {practices}
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
            layout={tabletCollection ? 'list' : collectionLayout}
            cardsOnMobile
            label="Collection entries"
            collectionContext={data.entity}
          />
        {/key}
      </div>
    </section>
  {/if}

  {#if canContribute || data.entity.type === 'pattern' || data.entity.type === 'concept' || data.relationships.implementsPatterns.length > 0 || data.relationships.collectionMemberships.length > 0 || data.relationships.backlinks.length > 0}
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
      {#if canContribute}
        <ArticleContributionLink type={data.entity.type} id={data.entity.id} />
      {/if}

      <div class="relationship-grid">
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
            {#key `${data.entity.sourceId}:${data.entity.id}`}
              <BacklinksPanel items={data.relationships.backlinks} title={data.entity.title} />
            {/key}
          </section>
        {/if}
      </div>
    </aside>
  {/if}
</main>

<style>
  .recording-context {
    margin: 0 0 2rem;
    font-size: 0.85rem;
  }
  .recording-context > summary {
    min-height: 44px;
    cursor: pointer;
    font-weight: 600;
  }
  .article-top-navigation {
    display: contents;
  }
  .entity-breadcrumb-row {
    padding: 0.75rem max(3vw, calc((100vw - 1440px) / 2));
    border-bottom: 1px solid #e4e5e1;
  }
  .entity-page.reader-page {
    overflow: clip;
  }
  .article-reader {
    display: grid;
    grid-template-areas: 'header' 'body';
    grid-template-columns: minmax(0, 1fr);
    width: min(94%, 720px);
    margin: 0 auto;
    padding-top: clamp(1.5rem, 3vw, 3rem);
  }
  .article-reader .entity-article {
    grid-area: body;
    min-width: 0;
    width: 100%;
    margin: 0;
    padding: 1.75rem 0 3rem;
  }
  .article-reader.has-outline .entity-article {
    padding-top: 5.25rem;
  }
  .article-reader :global(.markdown-body h2),
  .article-reader :global(.markdown-body h3) {
    scroll-margin-top: 5rem;
  }
  .article-reader :global(.markdown-body h2) {
    font-size: clamp(1.75rem, 3vw, 2.5rem);
  }
  .article-reader :global(.markdown-body > h2:first-child) {
    border-top: 0;
  }
  .article-reader .visual-lesson :global(.markdown-body h2) {
    margin: 1.75rem 0 0.7rem;
    padding-top: 0.8rem;
    font-size: 1.2rem;
    line-height: 1.35;
  }
  .article-reader .visual-lesson :global(.markdown-body p),
  .article-reader .visual-lesson :global(.markdown-body ul) {
    margin-bottom: 1rem;
  }
  @media (max-width: 800px) {
    .has-reader-navigation .article-top-navigation :global(.breadcrumb-controls),
    .has-reader-navigation .article-top-navigation :global(.collection-paging),
    .has-reader-navigation .article-top-navigation .entity-breadcrumb-row,
    .has-reader-navigation
      .article-top-navigation
      :global(.collection-browser:not(:has(.pattern-actions))),
    .article-reader :global(.article-outline) {
      display: none;
    }
    .article-reader.has-outline .entity-article {
      padding-top: 1.75rem;
    }
    .article-reader :global(.markdown-body h2),
    .article-reader :global(.markdown-body h3),
    .article-reader :global(.reader-header) {
      scroll-margin-top: 7rem;
    }
  }
  @media (min-width: 1200px) {
    .article-reader.has-outline {
      width: min(94%, 1160px);
      grid-template-columns: 180px minmax(0, 720px) 180px;
      grid-template-areas: 'contents header .' 'contents body .';
      column-gap: 40px;
    }
    .article-reader.has-outline .entity-article {
      padding-top: 1.75rem;
    }
    .article-reader :global(.markdown-body h2),
    .article-reader :global(.markdown-body h3) {
      scroll-margin-top: 1.5rem;
    }
  }
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
  @media (min-width: 601px) and (max-width: 1100px) {
    .collection-items-header :global(.library-view-switch) {
      display: none;
    }
  }
  @media (max-width: 800px) {
    .collection-items-header {
      grid-template-columns: minmax(0, 1fr);
      justify-items: start;
      gap: 1.25rem;
    }
  }
</style>

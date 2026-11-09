import { error, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import { building } from '$app/environment';
import { createHash } from 'node:crypto';
import type { EntryGenerator, PageServerLoad } from './$types';

import { entityRefKey } from '@patternverse/compiler';
import {
  compiledEntityIndex,
  loadCommons,
  summarizeEntity,
  type EntitySummary,
} from '$lib/server/commons';
import { renderEntityArticle } from '$lib/server/markdown';
import { legacyPracticeSource } from '@patternverse/compiler/practice';
import { patternPracticeOptions } from '$lib/practice-options';
import { patternShare } from '$lib/server/pattern-share';
import { articleNavigationContext } from '$lib/server/article-navigation';
import { loadGuidedMusicLesson } from '$lib/server/guided-music-lessons';
import {
  graphicDesignLegacyEntries,
  graphicDesignLegacyLocation,
} from '$lib/server/graphic-design-consolidation';

// Keep links to the former reframing groups useful after consolidating the collections.
const consolidatedCollections: Readonly<Record<string, string>> = {
  'gof-creational': 'gof-design-patterns',
  'gof-structural': 'gof-design-patterns',
  'gof-behavioral': 'gof-design-patterns',
  'reframing-start-here': 'reframing',
  'reframing-inspect-frame': 'reframing',
  'reframing-question-goal': 'reframing',
  'reframing-change-perspective': 'getting-unstuck',
  'reframing-move-forward': 'getting-unstuck',
};

const consolidatedVerses: Readonly<Record<string, string>> = {
  wellbeing: 'therapy',
};

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return [
    ...corpus.entities.map((entity) => ({ type: entity.type, id: entity.id })),
    // Draft review links from the former theory articles remain usable after reclassification.
    ...corpus.entities
      .filter(
        (entity) =>
          entity.id.startsWith('songwriting-') &&
          (entity.type === 'pattern' || entity.type === 'collection'),
      )
      .map((entity) => ({ type: 'concept', id: entity.id })),
    ...Object.keys(consolidatedCollections).map((id) => ({ type: 'collection', id })),
    ...Object.keys(consolidatedVerses).map((id) => ({ type: 'verse', id })),
    ...graphicDesignLegacyEntries(corpus.entities),
  ];
};

const summariesFor = (
  refs: readonly { sourceId: string; entityId: string }[],
  index: ReturnType<typeof compiledEntityIndex>,
): readonly EntitySummary[] =>
  refs.flatMap((ref) => {
    const entity = index.get(entityRefKey(ref));
    return entity
      ? [
          {
            ...summarizeEntity(entity),
            verseNames: entity.verseMemberships.flatMap((membership) => {
              const verse = index.get(entityRefKey(membership));
              return verse ? [verse.title] : [];
            }),
          },
        ]
      : [];
  });

export const load: PageServerLoad = async ({ params, url }) => {
  const destination = consolidatedCollections[params.id];
  if (params.type === 'collection' && destination) {
    redirect(308, `${base}/collection/${destination}`);
  }
  const corpus = await loadCommons();
  const graphicDesignLocation = graphicDesignLegacyLocation(
    params.type,
    params.id,
    corpus.entities,
    base,
    building ? '' : url.search,
  );
  if (graphicDesignLocation) redirect(308, graphicDesignLocation);
  if (params.type === 'concept' && params.id.startsWith('songwriting-')) {
    const songwriting = corpus.entities.find(
      (candidate) =>
        candidate.id === params.id &&
        (candidate.type === 'pattern' || candidate.type === 'collection'),
    );
    if (songwriting)
      redirect(308, `${base}/${songwriting.type}/${songwriting.id}${building ? '' : url.search}`);
  }
  const entity = corpus.entities.find(
    (candidate) =>
      candidate.type === params.type &&
      candidate.id ===
        (params.type === 'verse' ? (consolidatedVerses[params.id] ?? params.id) : params.id),
  );
  if (!entity) error(404, 'This Patternverse entity does not exist.');
  if (entity.type === 'verse') {
    redirect(308, `${base}/library?verse=${encodeURIComponent(`${entity.sourceId}:${entity.id}`)}`);
  }

  const index = compiledEntityIndex(corpus);
  const runnablePractice = entity.implementedByPractices
    .map((ref) => index.get(entityRefKey(ref)))
    .find((candidate) => candidate?.type === 'practice' && candidate.languagePracticeSource);
  const article = await renderEntityArticle(
    entity,
    corpus.entities,
    entity.type === 'pattern'
      ? { omitSections: ['With mira', 'Executable Pattern Markdown'] }
      : undefined,
  );
  return {
    entity,
    share: patternShare(corpus, entity),
    breadcrumbContext: articleNavigationContext(corpus, entity),
    practices: patternPracticeOptions(
      entity,
      entity.implementedByPractices.flatMap((ref) => {
        const practice = index.get(entityRefKey(ref));
        return practice ? [practice] : [];
      }),
    ),
    collectionOverviews:
      entity.type === 'pattern'
        ? [...entity.collectionMemberships]
            // Prefer the guided part over the accompanying reference indexes.
            // CollectionBrowser still honors an explicit collection in the URL.
            .sort((a, b) => {
              if (entity.sourceId !== 'commons' || !entity.id.startsWith('songwriting-')) return 0;
              return (
                Number(b.entityId.startsWith('songwriting-part-')) -
                Number(a.entityId.startsWith('songwriting-part-'))
              );
            })
            .flatMap((ref) => {
              const collection = index.get(entityRefKey(ref));
              return collection?.type === 'collection'
                ? [
                    {
                      collection: summarizeEntity(collection),
                      items: summariesFor(collection.collectionItems, index),
                    },
                  ]
                : [];
            })
        : [],
    isTherapyEntry: entity.verseMemberships.some((ref) => ref.entityId === 'therapy'),
    runnablePracticeId: runnablePractice?.id ?? null,
    worksheetSource:
      entity.languagePracticeSource ??
      (entity.practice
        ? legacyPracticeSource(entity.practice)
        : runnablePractice?.languagePracticeSource) ??
      null,
    renderedBody: article.html,
    musicLesson:
      entity.sourceId === 'commons' && entity.status === 'draft'
        ? await loadGuidedMusicLesson(entity.id)
        : null,
    contributionArticle: {
      sourceId: entity.sourceId,
      id: entity.id,
      type: entity.type,
      title: entity.title,
      path: `/${entity.type}/${entity.id}`,
      revision: createHash('sha256').update(entity.body).digest('hex'),
    },
    articleSections: article.sections,
    relationships: {
      backlinks: summariesFor(entity.backlinks, index),
      collectionItems: summariesFor(entity.collectionItems, index),
      collectionMemberships: summariesFor(entity.collectionMemberships, index),
      verseMemberships: summariesFor(entity.verseMemberships, index),
      verseMembers: summariesFor(entity.verseMembers, index),
      implementsPatterns: summariesFor(entity.implementsPatterns, index),
      implementedByPractices: summariesFor(entity.implementedByPractices, index),
    },
  };
};

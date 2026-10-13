import { error, redirect } from '@sveltejs/kit';
import { base } from '$app/paths';
import type { EntryGenerator, PageServerLoad } from './$types';

import { entityRefKey } from '@patternverse/compiler';
import {
  compiledEntityIndex,
  loadCommons,
  summarizeEntity,
  type EntitySummary,
} from '$lib/server/commons';
import { renderEntityMarkdown } from '$lib/server/markdown';
import { legacyPracticeSource } from '@patternverse/compiler/practice';

// Keep links to the former reframing groups useful after consolidating the collections.
const consolidatedCollections: Readonly<Record<string, string>> = {
  'reframing-start-here': 'reframing',
  'reframing-inspect-frame': 'reframing',
  'reframing-question-goal': 'reframing',
  'reframing-change-perspective': 'getting-unstuck',
  'reframing-move-forward': 'getting-unstuck',
};

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return [
    ...corpus.entities.map((entity) => ({ type: entity.type, id: entity.id })),
    ...Object.keys(consolidatedCollections).map((id) => ({ type: 'collection', id })),
  ];
};

const summariesFor = (
  refs: readonly { sourceId: string; entityId: string }[],
  index: ReturnType<typeof compiledEntityIndex>,
): readonly EntitySummary[] =>
  refs.flatMap((ref) => {
    const entity = index.get(entityRefKey(ref));
    return entity ? [summarizeEntity(entity)] : [];
  });

export const load: PageServerLoad = async ({ params }) => {
  const destination = consolidatedCollections[params.id];
  if (params.type === 'collection' && destination) {
    redirect(308, `${base}/collection/${destination}`);
  }
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (candidate) => candidate.type === params.type && candidate.id === params.id,
  );
  if (!entity) error(404, 'This Patternverse entity does not exist.');

  const index = compiledEntityIndex(corpus);
  const runnablePractice = entity.implementedByPractices
    .map((ref) => index.get(entityRefKey(ref)))
    .find((candidate) => candidate?.type === 'practice' && candidate.languagePracticeSource);
  return {
    entity,
    collectionOverviews:
      entity.type === 'pattern'
        ? entity.collectionMemberships.flatMap((ref) => {
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
    renderedBody: await renderEntityMarkdown(
      entity,
      corpus.entities,
      entity.type === 'pattern'
        ? { omitSections: ['With mira', 'Executable Pattern Markdown'] }
        : undefined,
    ),
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

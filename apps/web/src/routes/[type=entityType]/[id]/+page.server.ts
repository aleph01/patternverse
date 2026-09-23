import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

import { entityRefKey } from '@patternverse/compiler';
import {
  compiledEntityIndex,
  loadCommons,
  summarizeEntity,
  type EntitySummary,
} from '$lib/server/commons';
import { renderEntityMarkdown } from '$lib/server/markdown';

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return corpus.entities.map((entity) => ({ type: entity.type, id: entity.id }));
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
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (candidate) => candidate.type === params.type && candidate.id === params.id,
  );
  if (!entity) error(404, 'This Patternverse entity does not exist.');

  const index = compiledEntityIndex(corpus);
  return {
    entity,
    renderedBody: await renderEntityMarkdown(entity, corpus.entities),
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

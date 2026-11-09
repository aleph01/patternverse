import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad, RouteParams } from './$types';
import { loadCommons } from '$lib/server/commons';
import { embeddablePractice, patternShare } from '$lib/server/pattern-share';
import { sourceRunData } from '$lib/server/practice-run';

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return corpus.entities.flatMap((entity) => {
    if (entity.status !== 'published' || entity.sourceId !== 'commons') return [];
    const routes: RouteParams[] =
      entity.type === 'pattern' ? [{ mode: 'card', type: 'pattern', id: entity.id }] : [];
    const practice = embeddablePractice(entity);
    if (practice) routes.push({ mode: 'practice', type: practice.type, id: entity.id });
    return routes;
  });
};

export const load: PageServerLoad = async ({ params }) => {
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (item) =>
      item.sourceId === 'commons' &&
      item.status === 'published' &&
      item.type === params.type &&
      item.id === params.id,
  );
  if (!entity) error(404, 'This public embed is unavailable.');
  if (params.mode === 'card') {
    const share = patternShare(corpus, entity);
    if (!share) error(404, 'This pattern card is unavailable.');
    return { mode: 'card' as const, share, practice: null, runData: null };
  }
  if (params.mode !== 'practice') error(404, 'This embed format is unavailable.');
  const practice = embeddablePractice(entity);
  if (!practice) error(404, 'This practice cannot be embedded.');
  const parent =
    entity.type === 'pattern'
      ? entity
      : corpus.entities.find(
          (item) =>
            item.type === 'pattern' &&
            item.status === 'published' &&
            entity.implementsPatterns.some(
              (ref) => ref.entityId === item.id && ref.sourceId === item.sourceId,
            ),
        );
  const returnHref = parent
    ? (`/pattern/${parent.id}` as const)
    : (`/practice/${entity.id}` as const);
  return {
    mode: 'practice' as const,
    share: null,
    practice,
    runData: sourceRunData({ ...entity, title: practice.title }, returnHref),
  };
};

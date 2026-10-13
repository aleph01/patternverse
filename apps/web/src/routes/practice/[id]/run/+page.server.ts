import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { loadCommons } from '$lib/server/commons';
import { sourceRunData } from '$lib/server/practice-run';

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return corpus.entities
    .filter((entity) => entity.type === 'practice' && entity.languagePracticeSource)
    .map(({ id }) => ({ id }));
};
export const load: PageServerLoad = async ({ params }) => {
  const corpus = await loadCommons();
  const practice = corpus.entities.find(
    (entity) => entity.type === 'practice' && entity.id === params.id,
  );
  if (!practice || practice.type !== 'practice' || !practice.languagePracticeSource)
    error(404, 'This practice does not have interactive steps.');
  const parent = corpus.entities.find(
    (entity) =>
      entity.type === 'pattern' &&
      practice.implementsPatterns.some((ref) => ref.entityId === entity.id),
  );
  return sourceRunData(
    practice,
    parent ? `/pattern/${parent.id}` : `/practice/${practice.id}`,
    parent?.verseMemberships.some((ref) => ref.entityId === 'therapy') === true,
  );
};

import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { loadCommons } from '$lib/server/commons';
import { sourceRunData } from '$lib/server/practice-run';

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return corpus.entities
    .filter((entity) => entity.type === 'pattern' && entity.languagePracticeSource)
    .map(({ id }) => ({ id }));
};
export const load: PageServerLoad = async ({ params }) => {
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (candidate) => candidate.type === 'pattern' && candidate.id === params.id,
  );
  if (!entity?.languagePracticeSource)
    error(404, 'This pattern does not include an interactive practice.');
  return sourceRunData(entity, `/pattern/${entity.id}`);
};

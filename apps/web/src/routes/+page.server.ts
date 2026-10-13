import { loadCommons, summarizeEntity } from '$lib/server/commons';

export const load = async () => {
  const corpus = await loadCommons();
  return {
    verses: corpus.entities.filter((entity) => entity.type === 'verse').map(summarizeEntity),
  };
};

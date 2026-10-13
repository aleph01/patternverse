import { loadCommons, summarizeEntity } from '$lib/server/commons';

export const load = async () => {
  const corpus = await loadCommons();
  return { entities: corpus.entities.map(summarizeEntity) };
};

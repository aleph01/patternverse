import { loadCommons, summarizeEntity } from '$lib/server/commons';

export const load = async () => {
  const corpus = await loadCommons();
  return {
    entities: corpus.entities.map(summarizeEntity),
    searchDocuments: corpus.searchDocuments.map((document) => ({
      ...document,
      entityId: document.ref.entityId,
    })),
    verses: corpus.entities.filter((entity) => entity.type === 'verse').map(summarizeEntity),
  };
};

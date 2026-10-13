import { loadCommons, summarizeEntity } from '$lib/server/commons';

export const load = async () => {
  const corpus = await loadCommons();
  return {
    entities: corpus.entities.map(summarizeEntity),
    verses: corpus.entities
      .filter((entity) => entity.type === 'verse')
      .map((entity) => ({
        id: entity.id,
        sourceId: entity.sourceId,
        title: entity.title,
        itemKeys: entity.verseMembers.map((ref) => `${ref.sourceId}:${ref.entityId}`),
      })),
    searchDocuments: corpus.searchDocuments.map((document) => ({
      ...document,
      entityId: document.ref.entityId,
    })),
  };
};

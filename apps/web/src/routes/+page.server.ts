import { loadCommons, summarizeEntity } from '$lib/server/commons';
import { dailyPatternDay } from '$lib/daily-patterns';

export const load = async () => {
  const corpus = await loadCommons();
  const titles = new Map(corpus.entities.map((entity) => [entity.id, entity.title]));
  return {
    dailyPatternDay: dailyPatternDay(),
    dailyPatterns: corpus.entities
      .filter((entity) => entity.type === 'pattern' && entity.status === 'published')
      .map((entity) => ({
        ...summarizeEntity(entity),
        verseId: entity.verseMemberships[0]?.entityId,
        verseTitle: titles.get(entity.verseMemberships[0]?.entityId ?? ''),
      })),
    verses: corpus.entities.filter((entity) => entity.type === 'verse').map(summarizeEntity),
  };
};

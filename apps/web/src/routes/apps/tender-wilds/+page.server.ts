import { loadCommons } from '$lib/server/commons';

export const load = async () => ({
  patterns: (await loadCommons()).entities
    .filter((e) => e.type === 'pattern')
    .map((e) => ({
      key: `${e.sourceId}:${e.id}`,
      sourceId: e.sourceId,
      entityId: e.id,
      title: e.title,
    })),
});

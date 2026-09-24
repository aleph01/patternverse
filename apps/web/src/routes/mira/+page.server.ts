import type { PageServerLoad } from './$types';
import { loadCommons, summarizeEntity } from '$lib/server/commons';

/** Prerender public pattern summaries; private entries are loaded only on the device. */
export const load: PageServerLoad = async () => {
  const corpus = await loadCommons();
  return {
    patterns: corpus.entities
      .filter((entity) => entity.type === 'pattern')
      .map((entity) => ({
        ...summarizeEntity(entity),
        hasPractice: Boolean(entity.practice),
      })),
  };
};

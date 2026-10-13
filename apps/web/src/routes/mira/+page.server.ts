import type { PageServerLoad } from './$types';
import { loadCommons, summarizeEntity } from '$lib/server/commons';

/** Prerender public pattern summaries; private entries are loaded only on the device. */
export const load: PageServerLoad = async () => {
  const corpus = await loadCommons();
  return {
    therapyCollections: corpus.entities
      .filter(
        (entity) =>
          entity.type === 'collection' &&
          entity.verseMemberships.some(
            (verse) => verse.sourceId === 'commons' && verse.entityId === 'therapy',
          ),
      )
      .map((collection) => {
        const items = new Map<string, { sourceId: string; entityId: string }>();
        const visited = new Set<string>();
        const expand = (entity: typeof collection) => {
          const key = `${entity.sourceId}:${entity.id}`;
          if (visited.has(key)) return;
          visited.add(key);
          for (const ref of entity.collectionItems) {
            const child = corpus.entities.find(
              (entry) => entry.sourceId === ref.sourceId && entry.id === ref.entityId,
            );
            if (child?.type === 'collection') expand(child);
            else if (child?.type === 'pattern') items.set(`${ref.sourceId}:${ref.entityId}`, ref);
          }
        };
        expand(collection);
        return {
          sourceId: collection.sourceId,
          id: collection.id,
          title: collection.title,
          aliases: collection.aliases ?? [],
          items: [...items.values()],
        };
      }),
    patterns: corpus.entities
      .filter((entity) => entity.type === 'pattern')
      .map((entity) => ({
        ...summarizeEntity(entity),
        hasPractice: Boolean(entity.practice || entity.languagePracticeSource),
        verses: entity.type === 'pattern' ? (entity.verses ?? []) : [],
        tags: entity.tags ?? [],
        aliases: entity.aliases ?? [],
      })),
  };
};

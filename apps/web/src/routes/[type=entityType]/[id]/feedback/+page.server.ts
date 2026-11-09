import { error } from '@sveltejs/kit';
import { createHash } from 'node:crypto';
import { loadCommons } from '$lib/server/commons';
import { renderEntityArticle } from '$lib/server/markdown';
import type { EntryGenerator, PageServerLoad } from './$types';

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return corpus.entities
    .filter(
      (entity) => entity.status === 'published' && entity.type !== 'verse' && entity.body.trim(),
    )
    .map((entity) => ({ type: entity.type, id: entity.id }));
};

export const load: PageServerLoad = async ({ params }) => {
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (item) => item.type === params.type && item.id === params.id && item.status === 'published',
  );
  if (!entity || entity.type === 'verse') error(404, 'This article is not available for feedback.');
  const article = await renderEntityArticle(
    entity,
    corpus.entities,
    entity.type === 'pattern'
      ? { omitSections: ['With mira', 'Executable Pattern Markdown'] }
      : undefined,
  );
  if (!article.html) error(404, 'This article is not available for feedback.');
  return {
    html: article.html,
    article: {
      sourceId: entity.sourceId,
      id: entity.id,
      type: entity.type,
      title: entity.title,
      path: `/${entity.type}/${entity.id}`,
      revision: createHash('sha256').update(entity.body).digest('hex'),
    },
  };
};

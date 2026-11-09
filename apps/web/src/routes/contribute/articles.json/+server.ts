import { loadCommons } from '$lib/server/commons';

export const prerender = true;
export const GET = async () => {
  const corpus = await loadCommons();
  const articles = corpus.entities
    .filter((entity) => entity.status === 'published' && entity.type !== 'verse')
    .map((entity) => ({
      title: entity.title,
      type: entity.type,
      path: `/${entity.type}/${entity.id}`,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));
  return Response.json(articles, { headers: { 'cache-control': 'public, max-age=300' } });
};

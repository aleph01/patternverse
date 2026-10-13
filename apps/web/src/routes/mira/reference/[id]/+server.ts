import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { loadCommons } from '$lib/server/commons';
import { renderEntityMarkdown } from '$lib/server/markdown';
import { readableArticleSource } from '$lib/mira/article-source';
import { hasStandaloneSourcePractice } from '$lib/pattern-run/source-practice';
import { THERAPY_LIBRARY } from '$lib/mira/therapy-library';
import { REFRAMING_LIBRARY } from '$lib/pattern-run/reframing-library';

export const prerender = true;
export const entries = async () =>
  (await loadCommons()).entities.filter((e) => e.type === 'pattern').map(({ id }) => ({ id }));

/** Public Commons only. Private workspace material is resolved on the user's device. */
export const GET: RequestHandler = async ({ params }) => {
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (e) => e.type === 'pattern' && e.id === params.id && e.sourceId === 'commons',
  );
  if (!entity) error(404, 'Pattern article unavailable.');
  const bundled = [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].some((t) => t.slug === entity.id);
  return json({
    sourceId: entity.sourceId,
    id: entity.id,
    title: entity.title,
    summary: entity.summary ?? '',
    body: readableArticleSource(entity.body),
    html: await renderEntityMarkdown(entity, corpus.entities, {
      omitSections: ['With mira', 'Executable Pattern Markdown'],
    }),
    standaloneHref:
      bundled || hasStandaloneSourcePractice(entity)
        ? `/pattern/${entity.id}/run`
        : entity.practice
          ? `/pattern/${entity.id}/practice`
          : null,
  });
};

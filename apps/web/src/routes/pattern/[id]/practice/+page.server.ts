import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';

import { loadCommons } from '$lib/server/commons';
import { renderMarkdownPreview } from '$lib/client/markdown-preview';

export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return corpus.entities
    .filter((entity) => entity.type === 'pattern' && entity.practice)
    .map((entity) => ({ id: entity.id }));
};

export const load: PageServerLoad = async ({ params }) => {
  const corpus = await loadCommons();
  const entity = corpus.entities.find(
    (candidate) => candidate.type === 'pattern' && candidate.id === params.id,
  );
  if (!entity || entity.type !== 'pattern') error(404, 'This Pattern does not exist.');
  if (!entity.practice) error(404, 'This Pattern does not include an interactive Practice.');

  const markdownBlocks = entity.practice.steps.flatMap((step) =>
    step.blocks.filter((block) => block.type === 'markdown'),
  );
  const renderedEntries = await Promise.all(
    markdownBlocks.map(
      async (block) => [block.id, await renderMarkdownPreview(block.content)] as const,
    ),
  );

  return {
    pattern: {
      id: entity.id,
      title: entity.title,
      summary: entity.summary,
    },
    practice: entity.practice,
    markdownHtml: Object.fromEntries(renderedEntries),
  };
};

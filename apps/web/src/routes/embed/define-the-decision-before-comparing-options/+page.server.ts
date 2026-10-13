import { error } from '@sveltejs/kit';
import { loadCommons } from '$lib/server/commons';

/** One public, non-AI vertical slice. No private content or generic source execution endpoint. */
export async function load() {
  const corpus = await loadCommons();
  const pattern = corpus.entities.find(
    (entity) =>
      entity.type === 'pattern' && entity.id === 'define-the-decision-before-comparing-options',
  );
  if (!pattern?.languagePracticeSource) error(404, 'This practice is not available.');
  return { title: pattern.title, source: pattern.languagePracticeSource };
}

import { error } from '@sveltejs/kit';
import type { EntryGenerator, PageServerLoad } from './$types';
import { THERAPY_LIBRARY } from '$lib/mira/therapy-library';
import { REFRAMING_LIBRARY } from '$lib/pattern-run/reframing-library';
import { patternAiReason } from '$lib/pattern-run/ai-reason';
import { loadCommons } from '$lib/server/commons';
import { hasStandaloneSourcePractice } from '$lib/pattern-run/source-practice';

/** Pre-render one focused runner for each bundled, publicly documented technique. */
export const entries: EntryGenerator = async () => {
  const corpus = await loadCommons();
  return [
    ...new Set([
      ...[...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].map(({ slug }) => slug),
      ...corpus.entities
        .filter((entity) => entity.type === 'pattern' && hasStandaloneSourcePractice(entity))
        .map(({ id }) => id),
    ]),
  ].map((id) => ({ id }));
};

export const load: PageServerLoad = async ({ params }) => {
  const technique = [...THERAPY_LIBRARY, ...REFRAMING_LIBRARY].find(
    ({ slug }) => slug === params.id,
  );

  const corpus = await loadCommons();
  const pattern = corpus.entities.find(
    (entity) => entity.type === 'pattern' && entity.id === params.id,
  );
  if (!pattern) error(404, 'This pattern is not available.');
  const source = hasStandaloneSourcePractice(pattern) ? pattern.languagePracticeSource : null;
  if (!technique && !source) error(404, 'This pattern does not have a standalone run.');

  return {
    pattern: {
      id: pattern.id,
      title: pattern.title,
      summary: pattern.summary ?? '',
      sourceId: pattern.sourceId,
      type: 'pattern' as const,
      verseIds: pattern.verseMemberships.map((ref) => ref.entityId),
    },
    techniqueId: technique?.id ?? '',
    modality: technique?.modality ?? '',
    languagePracticeSource: source ?? null,
    isTherapy: pattern.verseMemberships.some((ref) => ref.entityId === 'therapy'),
    needsAi: Boolean(technique && 'needsAi' in technique && technique.needsAi === true),
    aiReason:
      technique && 'needsAi' in technique && technique.needsAi === true
        ? patternAiReason(technique.id)
        : null,
    inputNames: technique && 'inputNames' in technique ? technique.inputNames : [],
  };
};

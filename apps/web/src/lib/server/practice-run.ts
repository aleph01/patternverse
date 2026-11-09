import { sourcePracticeNeedsAi } from '$lib/pattern-run/source-practice';
import { patternAiReason } from '$lib/pattern-run/ai-reason';

/** Page-shell data only; execution is always delegated to the shared Rust runtime. */
export function sourceRunData(
  entity: {
    id: string;
    title: string;
    summary?: string;
    sourceId?: string;
    type?: 'pattern' | 'practice' | 'concept' | 'collection' | 'verse';
    languagePracticeSource?: string;
    tags?: readonly string[];
    verseMemberships: readonly { entityId: string }[];
  },
  returnHref: `/pattern/${string}` | `/practice/${string}`,
  parentIsTherapy = false,
) {
  return {
    pattern: {
      id: entity.id,
      title: entity.title,
      summary: entity.summary ?? '',
      sourceId: entity.sourceId ?? 'commons',
      type: entity.type === 'practice' ? ('practice' as const) : ('pattern' as const),
      verseIds: entity.verseMemberships.map((ref) => ref.entityId),
    },
    languagePracticeSource: entity.languagePracticeSource ?? null,
    techniqueId: '',
    modality: '',
    needsAi: sourcePracticeNeedsAi(entity),
    aiReason: sourcePracticeNeedsAi(entity) ? patternAiReason(entity.id) : null,
    inputNames: [] as readonly string[],
    returnHref,
    isTherapy: parentIsTherapy || entity.verseMemberships.some((ref) => ref.entityId === 'therapy'),
  };
}

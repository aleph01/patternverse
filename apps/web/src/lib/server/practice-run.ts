/** Page-shell data only; execution is always delegated to the shared Rust runtime. */
export function sourceRunData(
  entity: {
    id: string;
    title: string;
    summary?: string;
    sourceId?: string;
    type?: 'pattern' | 'practice' | 'concept' | 'collection' | 'verse';
    languagePracticeSource?: string;
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
    needsAi: false,
    aiReason: null,
    inputNames: [] as readonly string[],
    returnHref,
    isTherapy: parentIsTherapy || entity.verseMemberships.some((ref) => ref.entityId === 'therapy'),
  };
}

import type { CompiledEntity } from '@patternverse/compiler';

export type VerseAccent =
  | 1
  | 2
  | 3
  | 4
  | 5
  | 6
  | 7
  | 8
  | 9
  | 10
  | 11
  | 12
  | 13
  | 14
  | 15
  | 16
  | 17
  | 18
  | 19
  | 20
  | 21
  | 22
  | 23
  | 24
  | 25
  | 26;

// Editorial identities take precedence over the fallback for personal/future Verses.
export const COMMONS_VERSE_ACCENTS: Readonly<Record<string, VerseAccent>> = {
  'problem-solving': 1,
  'software-engineering': 2,
  learning: 3,
  'decision-making': 4,
  therapy: 5,
  'systems-thinking': 6,
  creativity: 7,
  collaboration: 8,
  'ai-usage': 9,
  statistics: 10,
  architecture: 11,
  business: 12,
  filmmaking: 13,
  'machine-learning': 14,
  music: 15,
  pedagogy: 16,
  photography: 17,
  'standup-comedy': 18,
  writing: 19,
  'graphic-design': 20,
  'agentic-coding': 21,
  'data-engineering': 22,
  engineering: 23,
  'organizational-design': 24,
  'data-visualization': 25,
  parenting: 26,
};

/** Assigns a stable palette slot without adding visual metadata to the corpus schema. */
export const verseAccent = (verseId: string): VerseAccent => {
  if (Object.hasOwn(COMMONS_VERSE_ACCENTS, verseId)) return COMMONS_VERSE_ACCENTS[verseId]!;
  const hash = [...verseId].reduce(
    (current, character) => (Math.imul(current, 47) + (character.codePointAt(0) ?? 0)) >>> 0,
    0,
  );
  // Keep fallback identities stable for existing personal Verses.
  return ((hash % 9) + 1) as VerseAccent;
};

export const verseAccentClass = (verseId: string): string => `verse-accent-${verseAccent(verseId)}`;

/** Collections inherit their first authored Verse; unassigned collections stay neutral. */
export const entityPageAccentClass = (
  entity: Pick<CompiledEntity, 'type' | 'id' | 'verseMemberships'>,
): string => {
  const verseId =
    entity.type === 'verse'
      ? entity.id
      : entity.type === 'collection'
        ? entity.verseMemberships[0]?.entityId
        : undefined;
  return verseId ? verseAccentClass(verseId) : '';
};

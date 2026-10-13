import type { CompiledEntity } from '@patternverse/compiler';

export type VerseAccent = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// Editorial identities take precedence over the fallback for personal/future Verses.
// Therapy and creativity share the purple family, but not the same shade.
export const COMMONS_VERSE_ACCENTS: Readonly<Record<string, VerseAccent>> = {
  wellbeing: 1,
  'software-engineering': 2,
  learning: 3,
  'decision-making': 4,
  therapy: 5,
  'systems-thinking': 6,
  creativity: 7,
  collaboration: 8,
  'ai-usage': 9,
};

/** Assigns a stable palette slot without adding visual metadata to the corpus schema. */
export const verseAccent = (verseId: string): VerseAccent => {
  if (Object.hasOwn(COMMONS_VERSE_ACCENTS, verseId)) return COMMONS_VERSE_ACCENTS[verseId]!;
  const hash = [...verseId].reduce(
    (current, character) => (Math.imul(current, 47) + (character.codePointAt(0) ?? 0)) >>> 0,
    0,
  );
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

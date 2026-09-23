export type VerseAccent = 1 | 2 | 3 | 4 | 5 | 6;

/** Assigns a stable palette slot without adding visual metadata to the corpus schema. */
export const verseAccent = (verseId: string): VerseAccent => {
  const hash = [...verseId].reduce(
    (current, character) => (Math.imul(current, 47) + (character.codePointAt(0) ?? 0)) >>> 0,
    0,
  );
  return ((hash % 6) + 1) as VerseAccent;
};

export const verseAccentClass = (verseId: string): string => `verse-accent-${verseAccent(verseId)}`;

import { describe, expect, it } from 'vitest';

import { verseAccent, verseAccentClass } from './verse-accent.js';

describe('Verse accent assignment', () => {
  it('is stable for an entity ID and always returns a palette slot', () => {
    expect(verseAccent('decision-making')).toBe(verseAccent('decision-making'));
    expect(verseAccentClass('decision-making')).toMatch(/^verse-accent-[1-6]$/);
  });

  it('distributes the example Verse corpus across the available palette', () => {
    const accents = [
      'collaboration',
      'creativity',
      'decision-making',
      'learning',
      'systems-thinking',
      'wellbeing',
    ].map(verseAccent);

    expect(new Set(accents).size).toBe(6);
  });
});

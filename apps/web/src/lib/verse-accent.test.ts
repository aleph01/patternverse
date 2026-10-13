import { describe, expect, it } from 'vitest';

import {
  COMMONS_VERSE_ACCENTS,
  entityPageAccentClass,
  verseAccent,
  verseAccentClass,
} from './verse-accent.js';

describe('Verse accent assignment', () => {
  it('is stable for an entity ID and always returns a palette slot', () => {
    expect(verseAccent('decision-making')).toBe(verseAccent('decision-making'));
    expect(verseAccentClass('decision-making')).toMatch(/^verse-accent-[1-9]$/);
    expect(verseAccent('my-personal-verse')).toBe(verseAccent('my-personal-verse'));
    expect(verseAccentClass('my-personal-verse')).toMatch(/^verse-accent-[1-9]$/);
    expect(verseAccentClass('constructor')).toMatch(/^verse-accent-[1-9]$/);
  });

  it('gives all nine Commons Verses distinct, intentional palette slots', () => {
    const accents = Object.keys(COMMONS_VERSE_ACCENTS).map(verseAccent);
    expect(accents).toHaveLength(9);
    expect(new Set(accents).size).toBe(9);
    expect(verseAccent('therapy')).toBe(5);
    expect(verseAccent('creativity')).toBe(7);
    expect(verseAccent('learning')).toBe(3);
  });

  it('gives a collection the same accent as its Verse page, not its own ID', () => {
    for (const verseId of ['therapy', 'software-engineering', 'creativity', 'ai-usage']) {
      const verse = { type: 'verse' as const, id: verseId, verseMemberships: [] };
      const collection = {
        type: 'collection' as const,
        id: 'collection-with-an-independent-id',
        verseMemberships: [{ sourceId: 'commons', entityId: verseId }],
      };
      expect(entityPageAccentClass(collection)).toBe(entityPageAccentClass(verse));
      expect(entityPageAccentClass(collection)).toBe(verseAccentClass(verseId));
    }
  });

  it('uses the first authored Verse when a collection belongs to several', () => {
    expect(
      entityPageAccentClass({
        type: 'collection',
        id: 'getting-unstuck',
        verseMemberships: [
          { sourceId: 'commons', entityId: 'creativity' },
          { sourceId: 'commons', entityId: 'learning' },
        ],
      }),
    ).toBe(verseAccentClass('creativity'));
  });

  it('leaves unassigned collections and other article types neutral', () => {
    expect(
      entityPageAccentClass({ type: 'collection', id: 'unassigned', verseMemberships: [] }),
    ).toBe('');
    for (const type of ['pattern', 'concept', 'practice'] as const) {
      expect(
        entityPageAccentClass({
          type,
          id: 'example',
          verseMemberships: [{ sourceId: 'commons', entityId: 'therapy' }],
        }),
      ).toBe('');
    }
  });
});

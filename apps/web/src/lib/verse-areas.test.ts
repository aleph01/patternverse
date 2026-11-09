import { describe, expect, it } from 'vitest';
import { groupVersesByArea, VERSE_AREAS, verseArea } from './verse-areas';

describe('Verse Areas', () => {
  it('sorts Areas and current Commons Verses alphabetically within each Area', () => {
    const current = [
      'agentic-coding',
      'ai-usage',
      'architecture',
      'business',
      'collaboration',
      'communication-and-relationships',
      'cooking',
      'creativity',
      'decision-making',
      'filmmaking',
      'graphic-design',
      'learning',
      'machine-learning',
      'music',
      'parenting',
      'pedagogy',
      'photography',
      'problem-solving',
      'software-engineering',
      'standup-comedy',
      'statistics',
      'systems-thinking',
      'therapy',
      'writing',
    ].map((id) => ({ id, title: id.replaceAll('-', ' '), sourceId: 'commons' }));
    const original = structuredClone(current);
    const groups = groupVersesByArea(current);
    expect(groups.map((group) => [group.area.id, group.verses.length])).toEqual([
      ['arts', 7],
      ['everyday', 1],
      ['health', 3],
      ['science', 5],
      ['thinking', 6],
      ['work', 2],
    ]);
    const members = groups.flatMap((group) => group.verses);
    expect(new Set(members).size).toBe(current.length);
    expect(members.every((verse) => current.includes(verse))).toBe(true);
    expect(
      groups.find((group) => group.area.id === 'thinking')!.verses.map((verse) => verse.id),
    ).toEqual([
      'creativity',
      'decision-making',
      'learning',
      'pedagogy',
      'problem-solving',
      'systems-thinking',
    ]);
    expect(current).toEqual(original);
    expect(
      groups.find((group) => group.area.id === 'health')!.verses.map((verse) => verse.id),
    ).toEqual(['communication-and-relationships', 'parenting', 'therapy']);
  });

  it('keeps personal and unfamiliar sources visible without classifying by a colliding ID', () => {
    const verses = [
      { id: 'learning', title: 'Learning', sourceId: 'personal', key: 'personal:learning' },
      { id: 'learning', title: 'Learning', sourceId: 'commons', key: 'commons:learning' },
      { id: 'learning', title: 'Zebra', sourceId: 'imported', key: 'imported:learning' },
      { id: 'future-verse', title: 'apple', sourceId: 'commons', key: 'commons:future-verse' },
      { id: 'z-personal', title: 'alpha', sourceId: 'personal', key: 'personal:z-personal' },
    ];
    expect(
      groupVersesByArea(verses).map((group) => [group.area.id, group.verses.map((v) => v.key)]),
    ).toEqual([
      ['other', ['commons:future-verse', 'imported:learning']],
      ['personal', ['personal:z-personal', 'personal:learning']],
      ['thinking', ['commons:learning']],
    ]);
  });

  it('only shows Everyday Life when content exists, with space for the proposed future fields', () => {
    expect(VERSE_AREAS.map((area) => area.id)).toContain('everyday');
    expect(groupVersesByArea([])).toEqual([]);
    for (const [id, area] of [
      ['cooking', 'everyday'],
      ['fashion', 'arts'],
      ['mechanics', 'science'],
    ]) {
      expect(verseArea({ id: id!, sourceId: 'commons' }).id).toBe(area);
    }
    expect(
      groupVersesByArea([{ id: 'cooking', title: 'Cooking', sourceId: 'commons' }])[0]!.area.id,
    ).toBe('everyday');
  });
});

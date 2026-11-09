import { describe, expect, it } from 'vitest';
import {
  dailyPatternDay,
  dailyPatternDateLabel,
  selectDailyPatterns,
  type DailyPattern,
} from './daily-patterns';

const pattern = (id: string, overrides: Partial<DailyPattern> = {}): DailyPattern => ({
  id,
  sourceId: 'commons',
  type: 'pattern',
  status: 'published',
  title: id,
  summary: 'A useful idea.',
  url: `/pattern/${id}`,
  verseId: `verse-${id}`,
  verseTitle: `Verse ${id}`,
  ...overrides,
});
const candidates = Array.from({ length: 23 }, (_, index) => pattern(`pattern-${index}`));

describe('daily discovery', () => {
  it('uses the German calendar day across both daylight-saving offsets', () => {
    expect(dailyPatternDay(new Date('2026-10-04T21:59:59Z'))).toBe('2026-10-04');
    expect(dailyPatternDay(new Date('2026-10-04T22:00:00Z'))).toBe('2026-10-05');
    expect(dailyPatternDay(new Date('2026-12-04T22:59:59Z'))).toBe('2026-12-04');
    expect(dailyPatternDay(new Date('2026-12-04T23:00:00Z'))).toBe('2026-12-05');
    expect(dailyPatternDay(new Date('2026-10-25T00:59:59Z'))).toBe('2026-10-25');
    expect(dailyPatternDay(new Date('2026-10-25T01:00:00Z'))).toBe('2026-10-25');
    expect(dailyPatternDateLabel('2026-10-04')).toBe('4 October');
  });

  it('selects the same three records regardless of refresh, input order or title edits', () => {
    const ids = (entries: DailyPattern[]) => entries.map((entry) => entry.id);
    const selection = ids(selectDailyPatterns(candidates, '2026-10-04'));
    expect(selection).toHaveLength(3);
    expect(new Set(selection).size).toBe(3);
    expect(ids(selectDailyPatterns([...candidates].reverse(), '2026-10-04'))).toEqual(selection);
    expect(
      ids(
        selectDailyPatterns(
          candidates.map((entry) => ({ ...entry, title: 'Renamed', verseTitle: 'Renamed verse' })),
          '2026-10-04',
        ),
      ),
    ).toEqual(selection);
    expect(ids(selectDailyPatterns(candidates, '2026-10-04'))).toEqual(selection);
  });

  it('only includes published Commons patterns, deduplicates records and preserves metadata', () => {
    const entries = [
      pattern('public'),
      pattern('public'),
      pattern('draft', { status: 'draft' }),
      pattern('verse', { type: 'verse' }),
      pattern('collection', { type: 'collection' }),
      pattern('concept', { type: 'concept' }),
      pattern('practice', { type: 'practice' }),
      pattern('private', { sourceId: 'my-workspace' }),
      pattern('unassigned', { verseId: undefined }),
      pattern('empty-verse', { verseId: '' }),
    ];
    expect(selectDailyPatterns(entries, '2026-10-04')).toEqual([pattern('public')]);
  });

  it('changes daily with no consecutive-day repeats when there are at least six verses', () => {
    const today = selectDailyPatterns(candidates, '2026-10-04');
    const tomorrow = selectDailyPatterns(candidates, '2026-10-05');
    expect(tomorrow).not.toEqual(today);
    expect(tomorrow.some((entry) => today.some((previous) => previous.id === entry.id))).toBe(
      false,
    );
  });

  it('selects three distinct verses every day even when one verse dominates the library', () => {
    const entries = [
      ...Array.from({ length: 24 }, (_, index) =>
        pattern(`creativity-${index}`, { verseId: 'creativity', verseTitle: 'Creativity' }),
      ),
      pattern('learning', { verseId: 'learning', verseTitle: 'Learning' }),
      pattern('design', { verseId: 'design', verseTitle: 'Design' }),
      pattern('music', { verseId: 'music', verseTitle: 'Music' }),
    ];
    const featured = new Set<string>();
    for (let offset = 0; offset < 40; offset += 1) {
      const day = new Date(Date.UTC(2026, 9, 4 + offset)).toISOString().slice(0, 10);
      const selection = selectDailyPatterns(entries, day);
      expect(selection).toHaveLength(3);
      expect(new Set(selection.map((entry) => entry.verseId)).size).toBe(3);
      expect(selectDailyPatterns([...entries].reverse(), day)).toEqual(selection);
      selection.forEach((entry) => featured.add(entry.id));
    }
    expect(featured.size).toBe(entries.length);
  });

  it('uses verse IDs even when different verses share a title', () => {
    const entries = candidates.slice(0, 3).map((entry) => ({ ...entry, verseTitle: 'Same name' }));
    expect(selectDailyPatterns(entries, '2026-10-04')).toHaveLength(3);
  });

  it('shows only one pattern per available verse and rotates through all their patterns', () => {
    for (const verseCount of [1, 2, 3]) {
      const entries = Array.from({ length: 12 }, (_, index) =>
        pattern(`p-${index}`, { verseId: `verse-${index % verseCount}` }),
      );
      const featured = new Set<string>();
      for (let offset = 0; offset < 12; offset += 1) {
        const day = new Date(Date.UTC(2026, 9, 4 + offset)).toISOString().slice(0, 10);
        const selection = selectDailyPatterns(entries, day);
        expect(selection).toHaveLength(verseCount);
        expect(new Set(selection.map((entry) => entry.verseId)).size).toBe(verseCount);
        selection.forEach((entry) => featured.add(entry.id));
      }
      expect(featured.size).toBe(entries.length);
    }
  });

  it('eventually features every eligible pattern, including when the deck size divides by three', () => {
    for (const count of [6, 9, 23, 24]) {
      const entries = Array.from({ length: count }, (_, index) => pattern(`p-${index}`));
      const featured = new Set<string>();
      for (let offset = 0; offset < count; offset += 1) {
        const day = new Date(Date.UTC(2026, 9, 4 + offset)).toISOString().slice(0, 10);
        selectDailyPatterns(entries, day).forEach((entry) => featured.add(entry.id));
      }
      expect(featured.size).toBe(count);
    }
  });

  it('handles small or empty libraries without repeating a card', () => {
    for (const count of [0, 1, 2, 3]) {
      const selection = selectDailyPatterns(candidates.slice(0, count), '2026-10-04');
      expect(selection).toHaveLength(count);
      expect(new Set(selection.map((entry) => entry.id)).size).toBe(count);
    }
    expect(() => selectDailyPatterns(candidates, 'not-a-date')).toThrow(
      'Invalid daily pattern date',
    );
  });
});

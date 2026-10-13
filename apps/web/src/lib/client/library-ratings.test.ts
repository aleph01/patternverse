import { describe, expect, it } from 'vitest';
import { matchesLibraryRating } from './library-ratings';

describe('personal library rating thresholds', () => {
  it('includes unrated and not useful entries when no filter is applied', () => {
    for (const rating of [null, 0, 1, 2] as const)
      expect(matchesLibraryRating(rating, 'any')).toBe(true);
  });
  it('useful includes very useful but not unrated or not useful', () => {
    expect(
      [null, 0, 1, 2].map((rating) => matchesLibraryRating(rating as 0 | 1 | 2 | null, 'useful')),
    ).toEqual([false, false, true, true]);
  });
  it('very useful matches only the highest rating', () => {
    for (const rating of [null, 0, 1, 2] as const)
      expect(matchesLibraryRating(rating, 'very')).toBe(rating === 2);
  });
});

import type { Usefulness } from '@patternverse/workspace';

export type LibraryRatingFilter = 'any' | 'useful' | 'very';

export function matchesLibraryRating(rating: Usefulness, filter: LibraryRatingFilter): boolean {
  if (filter === 'any') return true;
  return filter === 'very' ? rating === 2 : rating === 1 || rating === 2;
}

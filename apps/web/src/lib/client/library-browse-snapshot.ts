import type { LibraryRatingFilter } from './library-ratings';
import type { LibraryCategory, LibraryScope } from './workspace-library-view';

export type EntryBrowseSnapshot = {
  page: number;
};

export type DesktopLibrarySnapshot = {
  query: string;
  scope: LibraryScope;
  category: LibraryCategory;
  browseCategories?: Record<LibraryScope, LibraryCategory>;
  searchCategory?: LibraryCategory;
  ratingFilter: LibraryRatingFilter;
  layout: 'list' | 'cards';
  entries: EntryBrowseSnapshot | null;
};

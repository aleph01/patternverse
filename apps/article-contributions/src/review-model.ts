import type { ContributionArticle, ContributionStatus } from './contract.js';

export const boardPath = '/owner/contributions';
export type ReviewScope = { id: string; title: string };
export type ReviewTaxonomy = { verses: ReviewScope[]; collections: ReviewScope[] };
export type ReviewCatalog = Record<string, ReviewTaxonomy>;
export type ReviewRow = {
  id: string;
  article_path: string;
  article_title: string;
  article_revision: string;
  status: ContributionStatus;
  label: string;
  reviewer_note: string;
  version: number;
  payload: string;
  created_at: string;
  updated_at: string;
};
export type QueueRow = Pick<
  ReviewRow,
  'id' | 'article_path' | 'article_title' | 'status' | 'label' | 'created_at'
> & {
  name: string;
  comments: number;
  edits: number;
};
export type ReviewEvent = {
  status: ContributionStatus;
  label: string;
  note: string;
  reviewer: string;
  created_at: string;
};
export type ReviewFilters = {
  status: string;
  q: string;
  verse: string;
  collection: string;
  label: string;
  sort: 'newest' | 'oldest';
  offset: number;
};
export type ReviewPage = {
  filters: ReviewFilters;
  queue: QueueRow[];
  more: boolean;
  counts: Record<string, number>;
  labels: string[];
  verses: ReviewScope[];
  collections: ReviewScope[];
  selected: ReviewRow | null;
  events: ReviewEvent[];
  tab: string;
  catalog: ReviewCatalog;
  manifest: Record<string, ContributionArticle>;
  notice: string;
  undo: { id: string; version: number } | null;
};
export const statusLabels: Record<ContributionStatus, string> = {
  pending: 'New',
  reviewing: 'In review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
};
export function scopeOptions(
  catalog: ReviewCatalog,
  field: keyof ReviewTaxonomy,
  verse = '',
): ReviewScope[] {
  const values = Object.values(catalog).filter(
    (item) => !verse || item.verses.some((v) => v.id === verse),
  );
  return [
    ...new Map(values.flatMap((item) => item[field]).map((scope) => [scope.id, scope])).values(),
  ].sort((a, b) => a.title.localeCompare(b.title));
}
export function filtersFrom(url: URL, catalog: ReviewCatalog): ReviewFilters {
  const value = (name: string, maximum = 120) =>
    (url.searchParams.get(name) ?? '').trim().slice(0, maximum);
  const verse = value('verse', 300);
  const validVerse = scopeOptions(catalog, 'verses').some((item) => item.id === verse) ? verse : '';
  const collection = value('collection', 300);
  return {
    status: ['pending', 'reviewing', 'approved', 'rejected', 'archived', 'all'].includes(
      value('status'),
    )
      ? value('status')
      : 'pending',
    q: value('q'),
    verse: validVerse,
    collection: scopeOptions(catalog, 'collections', validVerse).some(
      (item) => item.id === collection,
    )
      ? collection
      : '',
    label: value('label', 100),
    sort: value('sort') === 'oldest' ? 'oldest' : 'newest',
    offset: Math.min(100000, Math.max(0, Number.parseInt(value('offset')) || 0)),
  };
}
export function boardUrl(
  filters: ReviewFilters,
  extra: Record<string, string | number | undefined> = {},
): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...filters, ...extra }))
    if (value !== undefined && value !== '') params.set(key, String(value));
  return `${boardPath}?${params}${extra.review ? '#review' : ''}`;
}
export function scopeQuery(
  filters: ReviewFilters,
  catalog: ReviewCatalog,
): { where: string; values: string[] } {
  const clauses: string[] = [],
    values: string[] = [];
  if (filters.verse || filters.collection) {
    const paths = Object.entries(catalog)
      .filter(
        ([, item]) =>
          (!filters.verse || item.verses.some((v) => v.id === filters.verse)) &&
          (!filters.collection || item.collections.some((c) => c.id === filters.collection)),
      )
      .map(([path]) => path);
    // One bound JSON value avoids D1's parameter limit for large verses and collections.
    clauses.push('article_path IN (SELECT value FROM json_each(?))');
    values.push(JSON.stringify(paths));
  }
  if (filters.q) {
    clauses.push("(article_title LIKE ? ESCAPE '\\' OR payload LIKE ? ESCAPE '\\')");
    const term = `%${filters.q.replace(/[\\%_]/g, '\\$&')}%`;
    values.push(term, term);
  }
  if (filters.label) {
    clauses.push('label = ?');
    values.push(filters.label);
  }
  return { where: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', values };
}

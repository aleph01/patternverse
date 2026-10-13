import { describe, expect, it } from 'vitest';
import { BROWSE_PAGE_SIZE, paginationFor } from './pagination';

describe('Browsing pagination', () => {
  it('uses 20 entries, retains every entry, and handles an incomplete last page', () => {
    expect(BROWSE_PAGE_SIZE).toBe(20);
    expect(paginationFor(53, 1)).toMatchObject({ page: 1, pageCount: 3, start: 0, end: 20 });
    expect(paginationFor(53, 2)).toMatchObject({ start: 20, end: 40 });
    expect(paginationFor(53, 3)).toMatchObject({ start: 40, end: 53 });
  });
  it('handles empty, small and exact-page-sized lists and clamps out-of-range pages', () => {
    expect(paginationFor(0, 1)).toMatchObject({ page: 1, pageCount: 1, start: 0, end: 0 });
    expect(paginationFor(20, 1)).toMatchObject({ pageCount: 1, end: 20 });
    expect(paginationFor(21, 99)).toMatchObject({ page: 2, start: 20, end: 21 });
    expect(paginationFor(53, -1)).toMatchObject({ page: 1, start: 0 });
  });
  it('keeps large page sets compact with first, last and neighboring page numbers', () => {
    expect(paginationFor(60, 2).pages).toEqual([1, 2, 3]);
    expect(paginationFor(1000, 25).pages).toEqual([1, 'ellipsis', 24, 25, 26, 'ellipsis', 50]);
    expect(paginationFor(1000, 1).pages).toEqual([1, 2, 'ellipsis', 50]);
    expect(paginationFor(1000, 50).pages).toEqual([1, 'ellipsis', 49, 50]);
  });
});

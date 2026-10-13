export const BROWSE_PAGE_SIZE = 20;

export function paginationFor(total: number, requestedPage: number, pageSize = BROWSE_PAGE_SIZE) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(pageCount, Math.max(1, Math.trunc(requestedPage) || 1));
  const start = (page - 1) * pageSize;
  const end = Math.min(total, start + pageSize);
  const numbers = [1, pageCount, page - 1, page, page + 1].filter(
    (number) => number >= 1 && number <= pageCount,
  );
  const ordered = [
    ...new Set(
      pageCount <= 7 ? Array.from({ length: pageCount }, (_, index) => index + 1) : numbers,
    ),
  ].sort((left, right) => left - right);
  const pages: (number | 'ellipsis')[] = [];
  for (const number of ordered) {
    const previous = pages.at(-1);
    if (typeof previous === 'number' && number - previous > 1) pages.push('ellipsis');
    pages.push(number);
  }
  return { page, pageCount, start, end, pages };
}

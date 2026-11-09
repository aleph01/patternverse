export type SortOrder = 'alphabetical' | 'descending';
export type TicketCount = Readonly<{ category: string; tickets: number }>;

/** Fictional, fixed observations: changing the order never changes a measurement. */
export const ticketCounts: readonly TicketCount[] = Object.freeze(
  [
    { category: 'Access', tickets: 47 },
    { category: 'Billing', tickets: 124 },
    { category: 'Delivery', tickets: 83 },
    { category: 'Feedback', tickets: 28 },
    { category: 'Returns', tickets: 69 },
    { category: 'Setup', tickets: 42 },
    { category: 'Subscription', tickets: 97 },
    { category: 'Warranty', tickets: 35 },
  ].map((row) => Object.freeze(row)),
);

export function orderCounts(
  order: SortOrder,
  counts: readonly TicketCount[] = ticketCounts,
): TicketCount[] {
  return [...counts].sort((a, b) => {
    const alphabetical = a.category.localeCompare(b.category, 'en');
    return order === 'descending' ? b.tickets - a.tickets || alphabetical : alphabetical;
  });
}

export const formatUsd = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);

export function isCurrentUtcMonth(checkedAt: string | null, now = new Date()): boolean {
  if (!checkedAt) return false;
  const checked = new Date(checkedAt);
  return (
    checked.getUTCFullYear() === now.getUTCFullYear() && checked.getUTCMonth() === now.getUTCMonth()
  );
}

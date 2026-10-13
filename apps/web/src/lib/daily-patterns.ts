export const DAILY_PATTERNS_TIME_ZONE = 'Europe/Berlin';

export type DailyPattern = {
  readonly id: string;
  readonly sourceId: string;
  readonly type: string;
  readonly status: string;
  readonly title: string;
  readonly summary: string;
  readonly url: string;
  readonly verseTitle?: string;
};

/** One shared calendar day for all visitors, independent of their browser's time zone. */
export const dailyPatternDay = (date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DAILY_PATTERNS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
};

export const dailyPatternDateLabel = (day: string): string =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: DAILY_PATTERNS_TIME_ZONE,
    day: 'numeric',
    month: 'long',
  }).format(new Date(`${day}T12:00:00Z`));

/** A fixed shuffled deck, advanced three places daily; no storage or daily deployment needed. */
export const selectDailyPatterns = <T extends DailyPattern>(
  entries: readonly T[],
  day: string,
): T[] => {
  const eligible = new Map<string, T>();
  for (const entry of entries) {
    if (entry.sourceId === 'commons' && entry.type === 'pattern' && entry.status === 'published') {
      eligible.set(`${entry.sourceId}:${entry.id}`, entry);
    }
  }
  const deck = [...eligible.entries()]
    .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
    .map(([, entry]) => entry);

  // Keep this seed fixed so a refresh, build or input reordering cannot reshuffle the deck.
  let seed = 0x70617474;
  for (let index = deck.length - 1; index > 0; index -= 1) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const swap = seed % (index + 1);
    [deck[index], deck[swap]] = [deck[swap]!, deck[index]!];
  }
  if (deck.length === 0) return [];
  const ordinal = Math.floor(Date.parse(`${day}T00:00:00Z`) / 86_400_000);
  if (!Number.isFinite(ordinal)) throw new Error(`Invalid daily pattern date: ${day}`);
  const start = (((ordinal * 3) % deck.length) + deck.length) % deck.length;
  return Array.from(
    { length: Math.min(3, deck.length) },
    (_, index) => deck[(start + index) % deck.length]!,
  );
};

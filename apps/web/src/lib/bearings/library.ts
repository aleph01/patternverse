import type { BearingsGroup, BearingsPattern } from './catalog';
import type { BearingsCell } from '@patternverse/workspace';

export function libraryPatternCell(pattern: BearingsPattern): BearingsCell {
  return {
    id: crypto.randomUUID(),
    kind: 'pattern',
    text: '',
    pattern: {
      sourceId: pattern.sourceId,
      entityId: pattern.id,
      title: pattern.title,
      summary: pattern.summary,
    },
  };
}

export function libraryGroups(
  patterns: readonly BearingsPattern[],
  kind: 'verses' | 'collections',
) {
  const groups = new Map<string, BearingsGroup & { count: number }>();
  for (const pattern of patterns)
    for (const group of pattern[kind]) {
      const current = groups.get(group.key);
      groups.set(group.key, { ...group, count: (current?.count ?? 0) + 1 });
    }
  return [...groups.values()].sort((a, b) => a.title.localeCompare(b.title));
}
export function filterLibrary(
  patterns: readonly BearingsPattern[],
  verse: string | readonly string[],
  collection: string | readonly string[],
  query = '',
  withPractice = false,
) {
  const search = query.trim().toLowerCase();
  const verses = new Set(typeof verse === 'string' ? (verse ? [verse] : []) : verse);
  const collections = new Set(
    typeof collection === 'string' ? (collection ? [collection] : []) : collection,
  );
  return patterns.filter(
    (pattern) =>
      (!withPractice || pattern.practices.length > 0) &&
      (!verses.size || pattern.verses.some((group) => verses.has(group.key))) &&
      (!collections.size || pattern.collections.some((group) => collections.has(group.key))) &&
      `${pattern.title} ${pattern.summary}`.toLowerCase().includes(search),
  );
}

/** Mira-style quick lookup: match each term, with title matches first. */
export function patternSuggestions(patterns: readonly BearingsPattern[], query: string) {
  const normalize = (value: string) =>
    value
      .normalize('NFKD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .trim();
  const search = normalize(query);
  const terms = search.split(' ').filter(Boolean);
  return patterns
    .filter((pattern) => {
      const text = normalize(
        [pattern.title, pattern.summary, ...pattern.collections.map((group) => group.title)].join(
          ' ',
        ),
      );
      return terms.every((term) => text.includes(term));
    })
    .sort((a, b) => {
      const rank = (title: string) => {
        const value = normalize(title);
        return !search || value === search
          ? 0
          : value.startsWith(search)
            ? 1
            : value.includes(search)
              ? 2
              : 3;
      };
      return rank(a.title) - rank(b.title) || a.title.localeCompare(b.title);
    });
}

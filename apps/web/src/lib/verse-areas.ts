export type VerseArea = Readonly<{
  id: string;
  title: string;
  shortTitle: string;
}>;

/** Navigation groups, independent of corpus membership and publication status. */
export const VERSE_AREAS = [
  {
    id: 'thinking',
    title: 'Thinking & Learning',
    shortTitle: 'Thinking & learning',
    verseIds: [
      'problem-solving',
      'decision-making',
      'systems-thinking',
      'creativity',
      'learning',
      'pedagogy',
    ],
  },
  {
    id: 'arts',
    title: 'Arts & Design',
    shortTitle: 'Arts & design',
    verseIds: [
      'writing',
      'photography',
      'filmmaking',
      'music',
      'standup-comedy',
      'graphic-design',
      'architecture',
      'fashion',
    ],
  },
  {
    id: 'science',
    title: 'Science & Technology',
    shortTitle: 'Science & tech',
    verseIds: [
      'statistics',
      'machine-learning',
      'data-engineering',
      'data-visualization',
      'software-engineering',
      'agentic-coding',
      'ai-usage',
      'mechanics',
    ],
  },
  {
    id: 'work',
    title: 'Work & Organizations',
    shortTitle: 'Work',
    verseIds: ['business', 'collaboration', 'organizational-design'],
  },
  {
    id: 'health',
    title: 'Life & Wellbeing',
    shortTitle: 'Wellbeing',
    verseIds: ['communication-and-relationships', 'therapy', 'parenting'],
  },
  {
    id: 'everyday',
    title: 'Everyday Life',
    shortTitle: 'Everyday life',
    verseIds: ['cooking', 'gardening', 'home-organization'],
  },
] as const;

const personalArea: VerseArea = { id: 'personal', title: 'My Verses', shortTitle: 'Mine' };
const otherArea: VerseArea = { id: 'other', title: 'More Verses', shortTitle: 'More' };
type VerseIdentity = Readonly<{ id: string; sourceId: string }>;
const placements = new Map<string, VerseArea>(
  VERSE_AREAS.flatMap((area) => area.verseIds.map((id) => [id, area] as const)),
);
const titles = new Intl.Collator('en', { sensitivity: 'base', numeric: true });

export function verseArea(verse: VerseIdentity): VerseArea {
  if (verse.sourceId === 'personal') return personalArea;
  return verse.sourceId === 'commons' ? (placements.get(verse.id) ?? otherArea) : otherArea;
}

export type VerseAreaGroup<T> = Readonly<{ area: VerseArea; verses: readonly T[] }>;

/** Retains original objects and source identity; empty Areas never become dead ends. */
export function groupVersesByArea<T extends VerseIdentity & { readonly title: string }>(
  verses: readonly T[],
): VerseAreaGroup<T>[] {
  const groups = new Map<string, T[]>();
  for (const verse of verses) {
    const id = verseArea(verse).id;
    const group = groups.get(id) ?? [];
    group.push(verse);
    groups.set(id, group);
  }
  return [...VERSE_AREAS, personalArea, otherArea]
    .flatMap((area) => {
      const members = groups.get(area.id);
      if (!members?.length) return [];
      members.sort((a, b) => titles.compare(a.title, b.title));
      return [{ area, verses: members }];
    })
    .sort((a, b) => titles.compare(a.area.title, b.area.title));
}

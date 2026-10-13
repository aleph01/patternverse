import { expect, it } from 'vitest';
import fc from 'fast-check';
import type { SavedPracticeRun } from '@patternverse/workspace';
import {
  historyCanResume,
  historyDate,
  historyDateGroup,
  historyHighlights,
  historySnippet,
  historyVerseNames,
  practiceHistoryView,
} from './practice-history-view';

const now = new Date(2026, 9, 7, 12);
const at = (day: number, hour = 12) => new Date(2026, 9, day, hour).toISOString();
const run: SavedPracticeRun = {
  id: 'one',
  workspaceId: 'private',
  patternRef: { sourceId: 'commons', entityId: 'test-pattern' },
  patternType: 'pattern',
  patternTitle: 'Test pattern',
  title: 'A private run',
  verseIds: ['learning'],
  origin: 'patternverse',
  status: 'completed',
  revision: 1,
  responses: [{ id: 'answer', prompt: 'What matters?', answer: 'Keep hosting costs low.' }],
  createdAt: at(1),
  updatedAt: at(7),
};
const commonPattern = {
  id: 'test-pattern',
  sourceId: 'commons',
  type: 'pattern' as const,
  title: 'Test pattern',
};
function view(
  runs: readonly SavedPracticeRun[],
  extra: Partial<Parameters<typeof practiceHistoryView>[0]> = {},
) {
  return practiceHistoryView({
    runs,
    query: '',
    verse: '',
    status: '',
    page: 1,
    selectedId: '',
    verseNames: {},
    now,
    ...extra,
  });
}
it('keeps the empty projection and pagination well-defined', () => {
  expect(view([])).toMatchObject({
    filtered: [],
    rows: [],
    selected: undefined,
    verseIds: [],
    pagination: { page: 1, pageCount: 1, start: 0, end: 0 },
  });
});
it('uses existing all-term search with verse and status filters, and never mutates input', () => {
  const rows = Object.freeze([
    { ...run, id: 'old', updatedAt: at(1) },
    { ...run, id: 'new', updatedAt: at(7), status: 'in-progress' as const },
    { ...run, id: 'other', verseIds: ['therapy'] },
  ]);
  const result = view(rows, { query: 'HOSTING low', verse: 'learning', status: 'in-progress' });
  expect(result.filtered.map((r) => r.id)).toEqual(['new']);
  expect(result.rows[0].run.id).toBe('new');
  expect(rows.map((r) => r.id)).toEqual(['old', 'new', 'other']);
  expect(view(rows, { query: 'missing' }).rows).toEqual([]);
});
it('keeps newest-first ordering and the existing ID tie-breaker', () => {
  const result = view([
    { ...run, id: 'z' },
    { ...run, id: 'old', updatedAt: at(1) },
    { ...run, id: 'a' },
  ]);
  expect(result.rows.map(({ run }) => run.id)).toEqual(['a', 'z', 'old']);
});
it('paginates twenty records, clamps stale page requests and falls back to the first visible run', () => {
  const runs = Array.from({ length: 41 }, (_, i) => ({ ...run, id: String(i).padStart(3, '0') }));
  expect(view(runs).rows).toHaveLength(20);
  const result = view(runs, { page: 99, selectedId: 'deleted' });
  expect(result.pagination.page).toBe(3);
  expect(result.rows).toHaveLength(1);
  expect(result.selected?.id).toBe('040');
  expect(view(runs, { page: -1 }).pagination.page).toBe(1);
});
it('preserves source-linked selection even on another page, but not when filtered out', () => {
  const runs = Array.from({ length: 21 }, (_, i) => ({
    ...run,
    id: String(i).padStart(3, '0'),
    status: i === 20 ? ('stopped' as const) : ('completed' as const),
  }));
  expect(view(runs, { selectedId: '020' }).selected?.id).toBe('020');
  expect(view(runs, { selectedId: '020', status: 'completed' }).selected?.id).toBe('000');
});
it('derives verse labels using the current personal override and unknown-ID fallback', () => {
  const labels = historyVerseNames(
    [{ ...commonPattern, type: 'verse', id: 'learning', title: 'Learning' }, commonPattern],
    [
      {
        ...commonPattern,
        sourceId: 'personal',
        type: 'verse',
        id: 'learning',
        title: 'My Learning',
      },
    ],
  );
  expect(labels).toEqual({ learning: 'My Learning' });
  expect(
    view([{ ...run, verseIds: ['zzz', 'learning', 'aaa', 'zzz'] }], { verseNames: labels })
      .verseIds,
  ).toEqual(['aaa', 'learning', 'zzz']);
});
it('keeps verse options based on all saved runs, even when filters have no matches', () => {
  expect(view([run], { query: 'no match' }).verseIds).toEqual(['learning']);
});
it.each([
  [at(7, 0), 'Today'],
  [at(8), 'Today'],
  [at(6), 'This week'],
  [at(5, 0), 'This week'],
  [at(4), 'Earlier'],
])('groups %s as %s using local midnight and a Monday week boundary', (date, expected) => {
  const before = now.getTime();
  expect(historyDateGroup(date, now)).toBe(expected);
  expect(now.getTime()).toBe(before);
});
it('handles Sunday/Monday and local DST calendar boundaries without subtracting fixed day lengths', () => {
  const sunday = new Date(2026, 9, 11, 12),
    monday = new Date(2026, 9, 12, 12);
  expect(historyDateGroup(at(5, 0), sunday)).toBe('This week');
  expect(historyDateGroup(at(11), monday)).toBe('Earlier');
  const dstWeek = new Date(2026, 2, 29, 12);
  expect(historyDateGroup(new Date(2026, 2, 23, 0).toISOString(), dstWeek)).toBe('This week');
  expect(historyDateGroup(new Date(2026, 2, 22, 23).toISOString(), dstWeek)).toBe('Earlier');
});
it('emits a group heading at the start of each page and at group boundaries', () => {
  const result = view([
    { ...run, id: 'a', updatedAt: at(7) },
    { ...run, id: 'b', updatedAt: at(7, 0) },
    { ...run, id: 'c', updatedAt: at(6) },
    { ...run, id: 'd', updatedAt: at(1) },
  ]);
  expect(result.rows.map((r) => [r.group, r.startsGroup])).toEqual([
    ['Today', true],
    ['Today', false],
    ['This week', true],
    ['Earlier', true],
  ]);
  const runs = Array.from({ length: 21 }, (_, i) => ({ ...run, id: String(i).padStart(3, '0') }));
  expect(view(runs, { page: 2 }).rows[0].startsGroup).toBe(true);
});
it('formats dates with the existing locale-aware options', () => {
  const date = at(7);
  expect(historyDate(date, 'en-GB')).toBe(
    new Intl.DateTimeFormat('en-GB', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date)),
  );
});
it('uses literal, case-insensitive highlights rather than regular expressions or HTML', () => {
  expect(historyHighlights('Hosting hosting', ' HOSTING ')).toEqual([
    { text: '', hit: false },
    { text: 'Hosting', hit: true },
    { text: ' ', hit: false },
    { text: 'hosting', hit: true },
    { text: '', hit: false },
  ]);
  expect(historyHighlights('<script>x.y</script>', '.')).toEqual([
    { text: '<script>x', hit: false },
    { text: '.', hit: true },
    { text: 'y</script>', hit: false },
  ]);
  expect(historyHighlights('No match', '')).toEqual([{ text: 'No match', hit: false }]);
});
it('chooses the matching response for snippets and preserves the existing answer/prompt fallback', () => {
  const rows = {
    ...run,
    responses: [
      { id: 'first', prompt: 'First', answer: 'Not relevant' },
      { id: 'second', prompt: 'What changed?', answer: 'Our hosting costs' },
    ],
  };
  expect(historySnippet(rows, 'hosting')).toBe('Our hosting costs');
  expect(historySnippet(rows, '')).toBe('Not relevant');
  expect(
    historySnippet({ ...run, responses: [{ id: 'empty', prompt: 'Prompt only', answer: '' }] }, ''),
  ).toBe('Prompt only');
  expect(historySnippet({ ...run, responses: [] }, '')).toBe('No confirmed responses yet.');
});
it('centers long snippets around the match with bounded length and ellipses', () => {
  const answer = 'a'.repeat(100) + 'needle' + 'b'.repeat(200);
  expect(
    historySnippet({ ...run, responses: [{ id: 'long', prompt: '', answer }] }, 'needle'),
  ).toBe('…' + answer.slice(65, 210) + '…');
});
it('reuses literal highlighting in row titles and snippets', () => {
  const result = view([{ ...run, title: 'Hosting decision' }], { query: 'hosting' });
  expect(result.rows[0].title.some((chunk) => chunk.text === 'Hosting' && chunk.hit)).toBe(true);
  expect(result.rows[0].snippet.some((chunk) => chunk.text === 'hosting' && chunk.hit)).toBe(true);
});
it.each([
  { status: 'completed' as const, checkpoint: 'source' },
  { status: 'stopped' as const, checkpoint: 'source' },
  { status: 'in-progress' as const, checkpoint: undefined },
  { status: 'in-progress' as const, checkpoint: '' },
  {
    status: 'in-progress' as const,
    checkpoint: 'source',
    patternRef: { sourceId: 'personal', entityId: 'test-pattern' },
  },
])('does not offer unsupported resume actions (%j)', (patch) => {
  expect(historyCanResume({ ...run, ...patch }, [commonPattern])).toBe(false);
});
it('offers resume only for an exact published source identity and type, without validating/replaying a checkpoint', () => {
  const saved = { ...run, status: 'in-progress' as const, checkpoint: 'opaque checkpoint' };
  expect(historyCanResume(saved, [commonPattern])).toBe(true);
  expect(historyCanResume(saved, [{ ...commonPattern, sourceId: 'personal' }])).toBe(false);
  expect(historyCanResume(saved, [{ ...commonPattern, type: 'practice' }])).toBe(false);
  expect(historyCanResume(saved, [])).toBe(false);
});
it('preserves all literal text across 100 generated highlight inputs', () => {
  fc.assert(
    fc.property(fc.string({ maxLength: 150 }), fc.string({ maxLength: 20 }), (value, query) => {
      expect(
        historyHighlights(value, query)
          .map((chunk) => chunk.text)
          .join(''),
      ).toBe(value);
    }),
    { numRuns: 100 },
  );
  const unicode = 'İstanbul, Straße, café and 日本語.';
  for (const query of ['i', 'straße', 'café', '日本', '.', ''])
    expect(
      historyHighlights(unicode, query)
        .map((chunk) => chunk.text)
        .join(''),
    ).toBe(unicode);
});
it('partitions generated catalogs once without losing/repeating records across pages', () => {
  fc.assert(
    fc.property(fc.integer({ min: 0, max: 150 }), (count) => {
      const runs = Array.from({ length: count }, (_, i) => ({
        ...run,
        id: String(i).padStart(3, '0'),
      }));
      const ids = Array.from({ length: Math.max(1, Math.ceil(count / 20)) }, (_, i) =>
        view(runs, { page: i + 1 }).rows.map((r) => r.run.id),
      ).flat();
      expect(ids).toEqual(runs.map((r) => r.id));
      expect(new Set(ids).size).toBe(count);
    }),
    { numRuns: 100 },
  );
});

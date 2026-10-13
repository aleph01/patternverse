import { searchPracticeRuns, type SavedPracticeRun } from '@patternverse/workspace';
import { paginationFor } from '$lib/pagination';
import type { EntitySummary } from '$lib/server/commons';

type HistoryEntity = Pick<EntitySummary, 'id' | 'sourceId' | 'type' | 'title'>;
export type HistoryHighlight = { text: string; hit: boolean };

/** Literal text chunks, never HTML. Search behavior remains in workspace code. */
export function historyHighlights(value: string, query: string): HistoryHighlight[] {
  const q = query.trim().toLocaleLowerCase();
  if (!q) return [{ text: value, hit: false }];
  const chunks: HistoryHighlight[] = [];
  const folded = value.toLocaleLowerCase();
  let start = 0;
  let at: number;
  while ((at = folded.indexOf(q, start)) >= 0) {
    chunks.push(
      { text: value.slice(start, at), hit: false },
      { text: value.slice(at, at + q.length), hit: true },
    );
    start = at + q.length;
  }
  chunks.push({ text: value.slice(start), hit: false });
  return chunks;
}

export function historySnippet(run: SavedPracticeRun, query: string): string {
  const q = query.trim().toLocaleLowerCase();
  const response =
    run.responses.find((r) => q && (r.answer + ' ' + r.prompt).toLocaleLowerCase().includes(q)) ??
    run.responses[0];
  const text = response?.answer || response?.prompt || 'No confirmed responses yet.';
  const at = q ? text.toLocaleLowerCase().indexOf(q) : 0;
  const start = Math.max(0, at - 35);
  return (
    (start ? '…' : '') + text.slice(start, start + 145) + (text.length > start + 145 ? '…' : '')
  );
}

export function historyDateGroup(value: string, now: Date): 'Today' | 'This week' | 'Earlier' {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const date = new Date(value);
  const week = new Date(today);
  week.setDate(week.getDate() - ((week.getDay() + 6) % 7));
  return date >= today ? 'Today' : date >= week ? 'This week' : 'Earlier';
}
export function historyDate(value: string, locale?: string): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}
export function historyVerseNames(
  commons: readonly HistoryEntity[],
  personal: readonly HistoryEntity[],
) {
  return Object.fromEntries(
    [...commons, ...personal].filter((e) => e.type === 'verse').map((e) => [e.id, e.title]),
  );
}
export function historyCanResume(
  run: SavedPracticeRun,
  commons: readonly HistoryEntity[],
): boolean {
  return (
    run.status === 'in-progress' &&
    !!run.checkpoint &&
    run.patternRef.sourceId === 'commons' &&
    commons.some(
      (e) =>
        e.id === run.patternRef.entityId &&
        e.type === run.patternType &&
        e.sourceId === run.patternRef.sourceId,
    )
  );
}

/** Website projection only; no new search, archive or checkpoint semantics. */
export function practiceHistoryView(input: {
  runs: readonly SavedPracticeRun[];
  query: string;
  verse: string;
  status: string;
  page: number;
  selectedId: string;
  verseNames: Readonly<Record<string, string>>;
  now: Date;
}) {
  const filtered = searchPracticeRuns(input.runs, input.query, input.verse, input.status);
  const pagination = paginationFor(filtered.length, input.page);
  const visible = filtered.slice(pagination.start, pagination.end);
  const selected = filtered.find((run) => run.id === input.selectedId) ?? visible[0];
  const verseIds = [...new Set(input.runs.flatMap((r) => r.verseIds))].sort((a, b) =>
    (input.verseNames[a] ?? a).localeCompare(input.verseNames[b] ?? b),
  );
  const rows = visible.map((run, index) => {
    const group = historyDateGroup(run.updatedAt, input.now);
    return {
      run,
      group,
      startsGroup:
        index === 0 || group !== historyDateGroup(visible[index - 1].updatedAt, input.now),
      title: historyHighlights(run.title, input.query),
      snippet: historyHighlights(historySnippet(run, input.query), input.query),
      date: historyDate(run.updatedAt),
    };
  });
  return { filtered, pagination, selected, verseIds, rows };
}

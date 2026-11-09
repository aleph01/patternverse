import {
  emptyBearingsNotebook,
  type BearingsCell as Cell,
  type BearingsNotebook as Notebook,
  type Situation,
} from '@patternverse/workspace';

import { branchIds, outlineCells, withParent, textKinds } from './outline';

export type DeletedCell = Readonly<{
  cell: Cell;
  chapterId: string;
  beforeId: string | null;
  descendants?: readonly Cell[];
}>;
export const notebookFor = (situation: Situation): Notebook =>
  situation.notebook ?? emptyBearingsNotebook();
export const allCells = (doc: Notebook) => doc.chapters.flatMap((chapter) => chapter.cells);
export const cellChapter = (doc: Notebook, id: string) =>
  doc.chapters.find((c) => c.cells.some((cell) => cell.id === id));
export function insertionAfter(doc: Notebook, id: string | null) {
  const chapter = id ? cellChapter(doc, id) : undefined;
  const cell = chapter?.cells.find((cell) => cell.id === id);
  const ids = chapter && cell ? branchIds(chapter.cells, cell.id) : new Set<string>();
  const ordered = chapter ? outlineCells(chapter.cells) : [];
  const at = ordered.findLastIndex((cell) => ids.has(cell.id));
  return {
    chapterId: chapter?.id ?? doc.activeChapterId,
    beforeId: ordered[at + 1]?.id ?? null,
    ...(cell?.parentId ? { parentId: cell.parentId } : {}),
  };
}
export function changeTextCellKind(
  doc: Notebook,
  id: string,
  kind: Notebook['draftKind'],
): Notebook {
  const cell = allCells(doc).find((cell) => cell.id === id);
  if (!cell || !['answer', 'note', 'approach'].includes(cell.kind))
    throw new Error('Only text cells can change between a note, comment, and own approach.');
  return {
    ...doc,
    draftKind: kind,
    chapters: doc.chapters.map((chapter) => ({
      ...chapter,
      cells: chapter.cells.map((cell) => (cell.id === id ? { ...cell, kind } : cell)),
    })),
  };
}
/** Older bottom-bar drafts become ordinary editable cells once, without losing their text. */
export function recoverNotebookDraft(doc: Notebook): Notebook {
  if (!doc.draft) return doc;
  return { ...insertCell(doc, textCell(doc.draftKind, doc.draft)), draft: '' };
}
export function updateCell(doc: Notebook, id: string, update: Partial<Cell>): Notebook {
  return {
    ...doc,
    chapters: doc.chapters.map((c) => ({
      ...c,
      cells: c.cells.map((cell) =>
        cell.id === id ? { ...cell, ...update, id: cell.id, kind: cell.kind } : cell,
      ),
    })),
  };
}
export function insertCell(
  doc: Notebook,
  cell: Cell,
  chapterId = doc.activeChapterId,
  beforeId: string | null = null,
): Notebook {
  if (allCells(doc).some((c) => c.id === cell.id))
    throw new Error('This cell is already in the notebook.');
  if (!doc.chapters.some((c) => c.id === chapterId)) throw new Error('Chapter not found.');
  return {
    ...doc,
    activeChapterId: chapterId,
    chapters: doc.chapters.map((chapter) => {
      if (chapter.id !== chapterId) return chapter;
      const cells = [...chapter.cells];
      const at = beforeId === null ? cells.length : cells.findIndex((c) => c.id === beforeId);
      if (at < 0) throw new Error('The drop position is no longer available.');
      cells.splice(at, 0, cell);
      return { ...chapter, collapsed: false, cells: outlineCells(cells) };
    }),
  };
}
/** Split into a sibling after the current branch, keeping its existing descendants attached. */
export function splitTextCell(
  doc: Notebook,
  id: string,
  before: string,
  after: string,
  bodyIncludesTitle = false,
): Notebook {
  const cell = allCells(doc).find((cell) => cell.id === id);
  if (!cell || !textKinds.has(cell.kind)) throw new Error('Only text cells can be split.');
  const nextCell = textCell(cell.kind as Notebook['draftKind'], after);
  const updated = updateCell(doc, id, {
    text: before,
    ...(bodyIncludesTitle ? { title: undefined } : {}),
  });
  const target = insertionAfter(updated, id);
  return {
    ...insertCell(
      updated,
      withParent(nextCell, target.parentId),
      target.chapterId,
      target.beforeId,
    ),
    activeCellId: nextCell.id,
  };
}
export function deleteCell(
  doc: Notebook,
  id: string,
): { document: Notebook; removed: DeletedCell } {
  const chapter = cellChapter(doc, id);
  if (!chapter) throw new Error('Cell not found.');
  const ids = branchIds(chapter.cells, id),
    ordered = outlineCells(chapter.cells);
  const branch = ordered.filter((cell) => ids.has(cell.id));
  const at = ordered.findLastIndex((cell) => ids.has(cell.id));
  const next: Notebook = {
    ...doc,
    chapters: doc.chapters.map((c) =>
      c.id === chapter.id ? { ...c, cells: c.cells.filter((cell) => !ids.has(cell.id)) } : c,
    ),
  };
  if (next.activeCellId && ids.has(next.activeCellId))
    delete (next as { activeCellId?: string }).activeCellId;
  return {
    document: next,
    removed: {
      cell: branch[0]!,
      chapterId: chapter.id,
      beforeId: ordered[at + 1]?.id ?? null,
      ...(branch.length > 1 ? { descendants: branch.slice(1) } : {}),
    },
  };
}
export function restoreCell(doc: Notebook, removed: DeletedCell): Notebook {
  const chapterId = doc.chapters.some((c) => c.id === removed.chapterId)
    ? removed.chapterId
    : doc.activeChapterId;
  return {
    ...doc,
    activeChapterId: chapterId,
    chapters: doc.chapters.map((chapter) => {
      if (chapter.id !== chapterId) return chapter;
      const cells = [...chapter.cells];
      const parent =
        removed.cell.parentId && cells.some((c) => c.id === removed.cell.parentId)
          ? removed.cell.parentId
          : undefined;
      const at = cells.findIndex((c) => c.id === removed.beforeId);
      cells.splice(
        at < 0 ? cells.length : at,
        0,
        withParent(removed.cell, parent),
        ...(removed.descendants ?? []),
      );
      return { ...chapter, collapsed: false, cells: outlineCells(cells) };
    }),
  };
}
export function moveCell(
  doc: Notebook,
  id: string,
  chapterId: string,
  beforeId: string | null,
): Notebook {
  const original = cellChapter(doc, id);
  if (!original) throw new Error('Cell not found.');
  if (beforeId && branchIds(original.cells, id).has(beforeId)) return doc;
  const destination = doc.chapters.find((c) => c.id === chapterId);
  if (!destination) throw new Error('Chapter not found.');
  const parentId = destination.cells.find((c) => c.id === beforeId)?.parentId;
  const result = deleteCell(doc, id);
  const next = restoreCell(result.document, {
    ...result.removed,
    chapterId,
    beforeId,
    cell: withParent(result.removed.cell, parentId),
  });
  return { ...next, ...(doc.activeCellId ? { activeCellId: doc.activeCellId } : {}) };
}

export function startChapter(
  doc: Notebook,
  title: string,
  previousTitle: string,
  id: string = crypto.randomUUID(),
): Notebook {
  if (!title.trim() || title.trim().length > 180) throw new Error('Give the chapter a title.');
  return {
    ...doc,
    activeChapterId: id,
    chapters: [
      ...doc.chapters.map((c) => ({
        ...c,
        title: doc.chapters.length === 1 ? previousTitle.trim() || 'Beginning' : c.title,
        collapsed: c.id === doc.activeChapterId ? true : c.collapsed,
      })),
      { id, title: title.trim(), collapsed: false, cells: [] },
    ],
  };
}
export function mergeChapters(doc: Notebook, earlierId: string, laterId: string): Notebook {
  const index = doc.chapters.findIndex((c) => c.id === earlierId);
  if (index < 0 || doc.chapters[index + 1]?.id !== laterId)
    throw new Error('Only neighboring chapters can be merged.');
  const earlier = doc.chapters[index]!,
    later = doc.chapters[index + 1]!;
  const chapters = [...doc.chapters];
  chapters.splice(index, 2, {
    ...earlier,
    collapsed: false,
    cells: [...earlier.cells, ...later.cells],
  });
  return { ...doc, activeChapterId: earlierId, chapters };
}
export const textCell = (kind: 'answer' | 'note' | 'approach', text: string): Cell => ({
  id: crypto.randomUUID(),
  kind,
  text,
});
export const ratingCell = (
  label: string,
  min = 0,
  max = 10,
  low = 'None',
  high = 'Very high',
): Cell => ({
  id: crypto.randomUUID(),
  kind: 'rating',
  text: '',
  rating: { label, min, max, low, high, value: null },
});

/** Runtime responses are copied once into ordinary answer cells; future reflections stay editable. */
export function recordPractice(
  doc: Notebook,
  cellId: string,
  practice: NonNullable<Cell['practice']>,
  responses: readonly { id: string; prompt: string; answer: string }[],
  runId: string,
): Notebook {
  const chapter = cellChapter(doc, cellId);
  if (!chapter) return doc;
  const copied = new Set(
    chapter.cells.find((c) => c.id === cellId)?.practice?.copiedResponseIds ?? [],
  );
  let next = doc;
  const origins = new Set(allCells(doc).map((c) => c.origin));
  let insertion = chapter.cells.findIndex((cell) => cell.id === cellId) + 1;
  while (chapter.cells[insertion]?.origin?.startsWith(`${cellId}:`)) insertion++;
  const beforeId = chapter.cells[insertion]?.id ?? null;
  for (const response of responses) {
    const origin = `${cellId}:${runId}:${response.id}`;
    if (copied.has(origin)) continue;
    copied.add(origin);
    if (origins.has(origin)) continue;
    next = insertCell(
      next,
      { ...textCell('answer', response.answer), prompt: response.prompt, origin, parentId: cellId },
      chapter.id,
      beforeId,
    );
    origins.add(origin);
  }
  return updateCell(next, cellId, { practice: { ...practice, copiedResponseIds: [...copied] } });
}

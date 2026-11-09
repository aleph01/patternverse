import {
  emptyBearingsNotebook,
  parseBearingsNotebook,
  type BearingsCell,
  type BearingsNotebook,
} from '@patternverse/workspace';

import { textKinds, withParent } from './outline';

export const libraryDragType = 'application/x-bearings-add';
export function hasLibraryDrag(event: DragEvent): boolean {
  return Array.from(event.dataTransfer?.types ?? []).includes(libraryDragType);
}
/** Copy library content with a fresh identity; never import draft, practice, or parent state. */
export function libraryCellFromData(raw: string): BearingsCell | null {
  if (!raw) return null;
  if (raw.length > 50000) throw new Error('That library item is too large.');
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('That library item is invalid.');
  const record = value as Record<string, unknown>;
  if (record.kind !== 'pattern' && record.kind !== 'rating')
    throw new Error('Drag a pattern or rating from the library.');
  const cell = {
    id: crypto.randomUUID(),
    kind: record.kind,
    text: '',
    ...(record.kind === 'pattern' ? { pattern: record.pattern } : { rating: record.rating }),
  };
  const notebook = emptyBearingsNotebook();
  return parseBearingsNotebook({
    ...notebook,
    chapters: [{ ...notebook.chapters[0], cells: [cell] }],
  }).chapters[0]!.cells[0]!;
}

/** A placeholder is replaceable only while it has no writing or widget state. */
export function isEmptyTextCell(cell: BearingsCell | undefined): boolean {
  return (
    !!cell &&
    textKinds.has(cell.kind) &&
    !cell.text.trim() &&
    !cell.title?.trim() &&
    !cell.prompt?.trim() &&
    !cell.pattern &&
    !cell.rating &&
    !cell.practice
  );
}
/** Keep the placeholder's position and identity so descendants remain attached. */
export function replaceEmptyLibraryCell(
  doc: BearingsNotebook,
  id: string | null | undefined,
  item: BearingsCell,
): BearingsNotebook | null {
  if (!id || (item.kind !== 'pattern' && item.kind !== 'rating')) return null;
  const chapter = doc.chapters.find((chapter) => chapter.cells.some((cell) => cell.id === id));
  const target = chapter?.cells.find((cell) => cell.id === id);
  if (!chapter || !target || !isEmptyTextCell(target)) return null;
  const replacement = withParent(
    {
      ...item,
      id: target.id,
      ...(target.collapsed !== undefined ? { collapsed: target.collapsed } : {}),
      ...(target.origin !== undefined ? { origin: target.origin } : {}),
    },
    target.parentId,
  );
  return {
    ...doc,
    activeChapterId: chapter.id,
    activeCellId: target.id,
    chapters: doc.chapters.map((current) =>
      current.id === chapter.id
        ? {
            ...current,
            collapsed: false,
            cells: current.cells.map((cell) => (cell.id === target.id ? replacement : cell)),
          }
        : current,
    ),
  };
}

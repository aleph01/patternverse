import type { BearingsCell as Cell, BearingsNotebook as Notebook } from '@patternverse/workspace';

export const textKinds = new Set<Cell['kind']>(['answer', 'note', 'approach']);
/** Legacy headings remain part of the writing when a card becomes a single text field. */
export const noteBody = (cell: Cell) =>
  [cell.title, cell.text].filter((part) => part !== undefined && part !== '').join('\n\n');
export const noteLabel = (cell: Cell) =>
  cell.title?.trim() ||
  cell.pattern?.title ||
  cell.rating?.label ||
  cell.text.trim().split('\n')[0]?.slice(0, 100) ||
  'Untitled note';
export const childCells = (cells: readonly Cell[], parentId?: string) =>
  cells.filter((cell) => cell.parentId === parentId);
export function outlineCells(cells: readonly Cell[]): Cell[] {
  const groups = new Map<string | undefined, Cell[]>();
  for (const cell of cells) {
    const group = groups.get(cell.parentId) ?? [];
    group.push(cell);
    groups.set(cell.parentId, group);
  }
  const stack = [...(groups.get(undefined) ?? [])].reverse(),
    result: Cell[] = [];
  const seen = new Set<string>();
  while (stack.length) {
    const cell = stack.pop()!;
    if (seen.has(cell.id)) throw new Error('A note cannot contain itself or an ancestor.');
    seen.add(cell.id);
    result.push(cell);
    stack.push(...[...(groups.get(cell.id) ?? [])].reverse());
  }
  if (result.length !== cells.length)
    throw new Error('A parent note must exist in the same chapter.');
  return result;
}
export function notePath(cells: readonly Cell[], id: string): Cell[] {
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const path: Cell[] = [],
    seen = new Set<string>();
  let cell = byId.get(id);
  while (cell) {
    if (seen.has(cell.id)) throw new Error('A note cannot contain itself or an ancestor.');
    seen.add(cell.id);
    path.unshift(cell);
    cell = cell.parentId ? byId.get(cell.parentId) : undefined;
  }
  return path;
}
export function branchIds(cells: readonly Cell[], id: string): Set<string> {
  const ids = new Set([id]);
  for (const cell of outlineCells(cells))
    if (cell.parentId && ids.has(cell.parentId)) ids.add(cell.id);
  return ids;
}
export function visibleOutlineCells(cells: readonly Cell[]): Cell[] {
  const hidden = new Set<string>(),
    byId = new Map(cells.map((cell) => [cell.id, cell]));
  return outlineCells(cells).filter((cell) => {
    if (cell.parentId && (hidden.has(cell.parentId) || byId.get(cell.parentId)?.collapsed)) {
      hidden.add(cell.id);
      return false;
    }
    return true;
  });
}
export function withParent(cell: Cell, parentId?: string): Cell {
  const next = { ...cell };
  if (parentId) next.parentId = parentId;
  else delete next.parentId;
  return next;
}
const chapterFor = (doc: Notebook, id: string) => {
  const chapter = doc.chapters.find((chapter) => chapter.cells.some((cell) => cell.id === id));
  if (!chapter) throw new Error('Note not found.');
  return chapter;
};
export function insertRelative(
  doc: Notebook,
  id: string | null,
  where: 'child' | 'above' | 'below',
  cell: Cell,
): Notebook {
  const chapter = id
    ? chapterFor(doc, id)
    : doc.chapters.find((c) => c.id === doc.activeChapterId)!;
  if (doc.chapters.some((c) => c.cells.some((c) => c.id === cell.id)))
    throw new Error('This note already exists.');
  const current = chapter.cells.find((c) => c.id === id);
  const parentId = current && where === 'child' ? current.id : current?.parentId;
  const siblings = childCells(chapter.cells, parentId);
  const at =
    current && where !== 'child'
      ? siblings.findIndex((c) => c.id === id) + (where === 'below' ? 1 : 0)
      : siblings.length;
  const before = siblings[at]?.id;
  const cells = [...chapter.cells];
  cells.splice(
    before ? cells.findIndex((c) => c.id === before) : cells.length,
    0,
    withParent(cell, parentId),
  );
  return {
    ...doc,
    activeChapterId: chapter.id,
    activeCellId: cell.id,
    chapters: doc.chapters.map((c) =>
      c.id === chapter.id
        ? {
            ...c,
            collapsed: false,
            cells: outlineCells(
              cells.map((c) => (c.id === parentId ? { ...c, collapsed: false } : c)),
            ),
          }
        : c,
    ),
  };
}
export function moveNoteBranch(
  doc: Notebook,
  id: string,
  direction: 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight',
): Notebook {
  const chapter = chapterFor(doc, id),
    cell = chapter.cells.find((c) => c.id === id)!;
  const siblings = childCells(chapter.cells, cell.parentId),
    at = siblings.findIndex((c) => c.id === id);
  let parentId = cell.parentId,
    beforeId: string | undefined;
  if (direction === 'ArrowUp') {
    if (!siblings[at - 1]) return doc;
    beforeId = siblings[at - 1]!.id;
  } else if (direction === 'ArrowDown') {
    if (!siblings[at + 1]) return doc;
    beforeId = siblings[at + 2]?.id;
  } else if (direction === 'ArrowRight') {
    if (!siblings[at - 1]) return doc;
    parentId = siblings[at - 1]!.id;
  } else {
    const parent = chapter.cells.find((c) => c.id === cell.parentId);
    if (!parent) return doc;
    parentId = parent.parentId;
    const outer = childCells(chapter.cells, parentId);
    beforeId = outer[outer.findIndex((c) => c.id === parent.id) + 1]?.id;
  }
  const ids = branchIds(chapter.cells, id),
    branch = outlineCells(chapter.cells).filter((c) => ids.has(c.id));
  const rest = chapter.cells.filter((c) => !ids.has(c.id));
  rest.splice(
    beforeId ? rest.findIndex((c) => c.id === beforeId) : rest.length,
    0,
    ...branch.map((c) => (c.id === id ? withParent(c, parentId) : c)),
  );
  return {
    ...doc,
    activeCellId: id,
    chapters: doc.chapters.map((c) =>
      c.id === chapter.id
        ? {
            ...c,
            cells: outlineCells(
              rest.map((c) => (c.id === parentId ? { ...c, collapsed: false } : c)),
            ),
          }
        : c,
    ),
  };
}
/** Move the original records, including practice state and descendants, without copying IDs. */
export function relocateNoteBranch(
  doc: Notebook,
  id: string,
  targetId: string | null,
  where: 'above' | 'below' | 'child',
): Notebook {
  const chapter = chapterFor(doc, id);
  const source = chapter.cells.find((cell) => cell.id === id)!;
  const target = targetId ? chapter.cells.find((cell) => cell.id === targetId) : undefined;
  if (targetId && !target) throw new Error('Move cards within the same chapter.');
  const ids = branchIds(chapter.cells, id);
  if (targetId && ids.has(targetId))
    throw new Error('A card cannot be moved inside its own branch.');
  const parentId = target ? (where === 'child' ? target.id : target.parentId) : undefined;
  const siblings = childCells(chapter.cells, parentId).filter((cell) => !ids.has(cell.id));
  const at =
    target && where !== 'child'
      ? siblings.findIndex((cell) => cell.id === target.id) + (where === 'below' ? 1 : 0)
      : siblings.length;
  const beforeId = siblings[at]?.id;
  const rest = chapter.cells.filter((cell) => !ids.has(cell.id));
  const branch = outlineCells(chapter.cells).filter((cell) => ids.has(cell.id));
  rest.splice(
    beforeId ? rest.findIndex((cell) => cell.id === beforeId) : rest.length,
    0,
    ...branch.map((cell) => (cell.id === source.id ? withParent(cell, parentId) : cell)),
  );
  return {
    ...doc,
    activeCellId: id,
    chapters: doc.chapters.map((c) =>
      c.id === chapter.id
        ? {
            ...c,
            cells: outlineCells(
              rest.map((cell) => (cell.id === parentId ? { ...cell, collapsed: false } : cell)),
            ),
          }
        : c,
    ),
  };
}

/** Merge text siblings in reading order; source widgets must keep their independent state. */
export function mergeTextNotes(
  doc: Notebook,
  id: string,
  direction: 'next' | 'previous',
): Notebook {
  const chapter = chapterFor(doc, id),
    source = chapter.cells.find((c) => c.id === id)!;
  const siblings = childCells(chapter.cells, source.parentId),
    at = siblings.findIndex((c) => c.id === id);
  const target = siblings[at + (direction === 'next' ? 1 : -1)];
  if (!target) return doc;
  if (!textKinds.has(source.kind) || !textKinds.has(target.kind))
    throw new Error(
      'Merge text notes together. Patterns and ratings keep their separate controls.',
    );
  const first = direction === 'next' ? source : target,
    last = direction === 'next' ? target : source;
  const merged: Cell = {
    ...target,
    kind: first.kind,
    text: [first.text, last.prompt, last.title, last.text].filter(Boolean).join('\n\n'),
  };
  if (first.title !== undefined) (merged as { title?: string }).title = first.title;
  else delete (merged as { title?: string }).title;
  if (first.prompt !== undefined) (merged as { prompt?: string }).prompt = first.prompt;
  else delete (merged as { prompt?: string }).prompt;
  const order = [...childCells(chapter.cells, first.id), ...childCells(chapter.cells, last.id)].map(
    (c) => c.id,
  );
  const cells = chapter.cells
    .filter((c) => c.id !== source.id)
    .map((c) =>
      c.id === target.id ? merged : c.parentId === source.id ? withParent(c, target.id) : c,
    );
  const byId = new Map(cells.map((c) => [c.id, c]));
  let childIndex = 0;
  const ordered = cells.map((c) =>
    c.parentId === target.id ? byId.get(order[childIndex++]!)! : c,
  );
  return {
    ...doc,
    activeCellId: target.id,
    chapters: doc.chapters.map((c) =>
      c.id === chapter.id ? { ...c, cells: outlineCells(ordered) } : c,
    ),
  };
}

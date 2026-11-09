/** Private notebook data. Library references never contain or publish these answers. */
export type BearingsPractice = Readonly<{
  ref: { sourceId: string; entityId: string };
  title: string;
  source: string;
  checkpoint?: string;
  draft?: string;
  copiedResponseIds?: readonly string[];
  status: 'in-progress' | 'completed' | 'stopped';
}>;
export type BearingsCell = Readonly<{
  id: string;
  kind: 'answer' | 'note' | 'approach' | 'pattern' | 'rating';
  text: string;
  title?: string;
  parentId?: string;
  collapsed?: boolean;
  prompt?: string;
  origin?: string;
  pattern?: Readonly<{ sourceId: string; entityId: string; title: string; summary: string }>;
  practice?: BearingsPractice;
  rating?: Readonly<{
    label: string;
    min: number;
    max: number;
    low: string;
    high: string;
    value: number | null;
  }>;
}>;
export type BearingsChapter = Readonly<{
  id: string;
  title: string;
  collapsed: boolean;
  cells: readonly BearingsCell[];
}>;
export type BearingsNotebook = Readonly<{
  version: 1;
  chapters: readonly BearingsChapter[];
  activeChapterId: string;
  draft: string;
  draftKind: 'answer' | 'note' | 'approach';
  scrollTop: number;
  view?: 'notebook' | 'tree' | 'document';
  activeCellId?: string;
  treeScrollLeft?: number;
  treeScrollTop?: number;
}>;

const object = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid notebook record.');
  return value as Record<string, unknown>;
};
const text = (value: unknown, limit: number, empty = true): string => {
  if (typeof value !== 'string' || value.length > limit || (!empty && !value.trim()))
    throw new Error('Notebook text is missing or too long.');
  return value;
};
const identity = (value: unknown) => text(value, 180, false);
const reference = (value: unknown) => {
  const r = object(value);
  return { sourceId: identity(r.sourceId), entityId: identity(r.entityId) };
};
function parseCell(value: unknown): BearingsCell {
  const r = object(value);
  if (!['answer', 'note', 'approach', 'pattern', 'rating'].includes(String(r.kind)))
    throw new Error('Unknown notebook cell type.');
  const kind = r.kind as BearingsCell['kind'];
  let pattern: BearingsCell['pattern'];
  let rating: BearingsCell['rating'];
  let practice: BearingsPractice | undefined;
  if (kind === 'pattern') {
    const p = object(r.pattern);
    pattern = { ...reference(p), title: text(p.title, 300, false), summary: text(p.summary, 3000) };
  } else if (r.pattern !== undefined || r.practice !== undefined)
    throw new Error('Only a library pattern can hold a practice.');
  if (kind === 'rating') {
    const v = object(r.rating);
    if (
      !Number.isFinite(v.min) ||
      !Number.isFinite(v.max) ||
      Number(v.min) >= Number(v.max) ||
      Number(v.max) - Number(v.min) > 10000 ||
      (v.value !== null &&
        (!Number.isFinite(v.value) ||
          Number(v.value) < Number(v.min) ||
          Number(v.value) > Number(v.max)))
    )
      throw new Error('Invalid rating scale or value.');
    rating = {
      label: text(v.label, 120, false),
      min: Number(v.min),
      max: Number(v.max),
      low: text(v.low, 180),
      high: text(v.high, 180),
      value: v.value === null ? null : Number(v.value),
    };
  } else if (r.rating !== undefined) throw new Error('Only a rating cell can hold a scale.');
  if (r.practice !== undefined) {
    const p = object(r.practice);
    if (
      p.copiedResponseIds !== undefined &&
      (!Array.isArray(p.copiedResponseIds) ||
        p.copiedResponseIds.length > 2000 ||
        p.copiedResponseIds.some((id) => typeof id !== 'string' || id.length > 1000))
    )
      throw new Error('Invalid response history.');
    if (!['in-progress', 'completed', 'stopped'].includes(String(p.status)))
      throw new Error('Invalid practice status.');
    practice = {
      ref: reference(p.ref),
      title: text(p.title, 300, false),
      source: text(p.source, 300000, false),
      status: p.status as BearingsPractice['status'],
      ...(p.checkpoint === undefined
        ? {}
        : { checkpoint: text(p.checkpoint, 2 * 1024 * 1024, false) }),
      ...(p.draft === undefined ? {} : { draft: text(p.draft, 300000) }),
    };
    if (p.copiedResponseIds !== undefined)
      practice = {
        ...practice,
        copiedResponseIds: (p.copiedResponseIds as unknown[]).map((id) => text(id, 1000, false)),
      };
  }
  if (r.collapsed !== undefined && typeof r.collapsed !== 'boolean')
    throw new Error('Invalid note collapse state.');
  return {
    id: identity(r.id),
    kind,
    text: text(r.text, 100000),
    ...(r.title === undefined ? {} : { title: text(r.title, 300) }),
    ...(r.parentId === undefined ? {} : { parentId: identity(r.parentId) }),
    ...(r.collapsed === undefined ? {} : { collapsed: r.collapsed as boolean }),
    ...(r.prompt === undefined ? {} : { prompt: text(r.prompt, 32000) }),
    ...(r.origin === undefined ? {} : { origin: text(r.origin, 1000, false) }),
    ...(pattern ? { pattern } : {}),
    ...(rating ? { rating } : {}),
    ...(practice ? { practice } : {}),
  };
}

/** Allowlisted projection used by local writes and portable workspace backups. */
export function parseBearingsNotebook(value: unknown): BearingsNotebook {
  const r = object(value);
  if (
    r.version !== 1 ||
    !Array.isArray(r.chapters) ||
    !r.chapters.length ||
    r.chapters.length > 100
  )
    throw new Error('A notebook needs between 1 and 100 sections.');
  const ids = new Set<string>();
  let cellCount = 0;
  const unique = (id: string) => {
    if (ids.has(id)) throw new Error('Duplicate notebook identity.');
    ids.add(id);
    return id;
  };
  const chapters = r.chapters.map((value) => {
    const c = object(value);
    if (typeof c.collapsed !== 'boolean' || !Array.isArray(c.cells))
      throw new Error('Invalid notebook chapter.');
    cellCount += c.cells.length;
    if (cellCount > 2000) throw new Error('A notebook can contain at most 2,000 cells.');
    const id = unique(identity(c.id));
    const cells = c.cells.map((value) => {
      const cell = parseCell(value);
      unique(cell.id);
      return cell;
    });
    const byId = new Map(cells.map((cell) => [cell.id, cell]));
    for (const cell of cells) {
      const ancestors = new Set<string>([cell.id]);
      let parentId = cell.parentId;
      while (parentId !== undefined) {
        if (ancestors.has(parentId))
          throw new Error('A note cannot contain itself or an ancestor.');
        ancestors.add(parentId);
        const parent = byId.get(parentId);
        if (!parent) throw new Error('A parent note must exist in the same chapter.');
        parentId = parent.parentId;
      }
    }
    return { id, title: text(c.title, 180, false), collapsed: c.collapsed, cells };
  });
  const activeChapterId = identity(r.activeChapterId);
  if (
    !chapters.some((c) => c.id === activeChapterId) ||
    !['answer', 'note', 'approach'].includes(String(r.draftKind)) ||
    !Number.isFinite(r.scrollTop) ||
    Number(r.scrollTop) < 0
  )
    throw new Error('Invalid notebook view state.');
  if (
    r.view !== undefined &&
    (typeof r.view !== 'string' || !['tree', 'notebook', 'document'].includes(r.view))
  )
    throw new Error('Invalid notebook view.');
  if (
    r.activeCellId !== undefined &&
    !chapters.some((c) => c.cells.some((cell) => cell.id === r.activeCellId))
  )
    throw new Error('The selected note no longer exists.');
  for (const field of ['treeScrollLeft', 'treeScrollTop'] as const)
    if (r[field] !== undefined && (!Number.isFinite(r[field]) || Number(r[field]) < 0))
      throw new Error('Invalid tree scroll position.');
  const parsed: BearingsNotebook = {
    version: 1,
    chapters,
    activeChapterId,
    draft: text(r.draft, 100000),
    draftKind: r.draftKind as BearingsNotebook['draftKind'],
    scrollTop: Number(r.scrollTop),
    ...(r.view === undefined ? {} : { view: r.view as BearingsNotebook['view'] }),
    ...(r.activeCellId === undefined ? {} : { activeCellId: identity(r.activeCellId) }),
    ...(r.treeScrollLeft === undefined ? {} : { treeScrollLeft: Number(r.treeScrollLeft) }),
    ...(r.treeScrollTop === undefined ? {} : { treeScrollTop: Number(r.treeScrollTop) }),
  };
  if (new TextEncoder().encode(JSON.stringify(parsed)).byteLength > 12 * 1024 * 1024)
    throw new Error('This notebook exceeds the 12 MB limit.');
  return parsed;
}

export function emptyBearingsNotebook(id: string = crypto.randomUUID()): BearingsNotebook {
  return {
    version: 1,
    chapters: [{ id, title: 'Beginning', collapsed: false, cells: [] }],
    activeChapterId: id,
    draft: '',
    draftKind: 'answer',
    scrollTop: 0,
  };
}

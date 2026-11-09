import { describe, expect, it } from 'vitest';
import {
  emptyBearingsNotebook,
  parseBearingsNotebook,
  type BearingsCell as Cell,
} from '@patternverse/workspace';
import {
  noteBody,
  insertRelative,
  mergeTextNotes,
  moveNoteBranch,
  relocateNoteBranch,
  outlineCells,
  visibleOutlineCells,
} from './outline';
import { deleteCell, restoreCell, moveCell, startChapter } from './notebook';
const note = (id: string, parentId?: string): Cell => ({
  id,
  kind: 'note',
  title: id,
  text: `${id} text`,
  ...(parentId ? { parentId } : {}),
});
const fixture = () => ({
  ...emptyBearingsNotebook('chapter'),
  activeCellId: 'a',
  chapters: [
    {
      id: 'chapter',
      title: 'Beginning',
      collapsed: false,
      cells: [
        note('a'),
        note('a1', 'a'),
        note('a11', 'a1'),
        note('a2', 'a'),
        note('b'),
        note('b1', 'b'),
        note('c'),
      ],
    },
  ],
});
const ids = (doc: Parameters<typeof relocateNoteBranch>[0]) =>
  doc.chapters[0]!.cells.map((c) => c.id);

describe('hierarchical notebook operations', () => {
  it('reparents complete branches at arbitrary sibling positions without changing their content', () => {
    let doc = relocateNoteBranch(fixture(), 'a1', 'b1', 'above');
    expect(ids(doc)).toEqual(['a', 'a2', 'b', 'a1', 'a11', 'b1', 'c']);
    expect(doc.chapters[0]!.cells.find((cell) => cell.id === 'a1')?.parentId).toBe('b');
    expect(doc.chapters[0]!.cells.find((cell) => cell.id === 'a11')).toEqual(note('a11', 'a1'));
    doc = relocateNoteBranch(doc, 'a1', 'b1', 'below');
    expect(ids(doc)).toEqual(['a', 'a2', 'b', 'b1', 'a1', 'a11', 'c']);
    doc = relocateNoteBranch(doc, 'a1', 'a2', 'child');
    expect(doc.chapters[0]!.cells.find((cell) => cell.id === 'a1')?.parentId).toBe('a2');
    doc = relocateNoteBranch(doc, 'a1', null, 'below');
    expect(ids(doc).slice(-2)).toEqual(['a1', 'a11']);
    expect(doc.chapters[0]!.cells.find((cell) => cell.id === 'a1')?.parentId).toBeUndefined();
    expect(parseBearingsNotebook(doc)).toEqual(doc);
  });
  it('rejects cycles, self drops and targets outside the current chapter', () => {
    const doc = fixture();
    expect(() => relocateNoteBranch(doc, 'a', 'a11', 'child')).toThrow('own branch');
    expect(() => relocateNoteBranch(doc, 'a1', 'a1', 'above')).toThrow('own branch');
    expect(() => relocateNoteBranch(doc, 'a', 'missing', 'below')).toThrow('same chapter');
    expect(ids(doc)).toEqual(ids(fixture()));
  });
  it('keeps pattern practice checkpoints and rating values when moving their cards', () => {
    const doc = fixture();
    const pattern: Cell = {
      ...note('a1', 'a'),
      kind: 'pattern',
      pattern: {
        sourceId: 'commons',
        entityId: 'decision',
        title: 'Decision',
        summary: 'Clarify a choice',
      },
      practice: {
        ref: { sourceId: 'commons', entityId: 'practice' },
        title: 'Exercise',
        source: 'authored practice',
        checkpoint: 'saved checkpoint',
        draft: 'saved answer',
        status: 'in-progress',
      },
    };
    const rating: Cell = {
      ...note('b1', 'b'),
      kind: 'rating',
      rating: { label: 'Confidence', min: 0, max: 10, low: 'Low', high: 'High', value: 7 },
    };
    const input = {
      ...doc,
      chapters: [
        {
          ...doc.chapters[0]!,
          cells: doc.chapters[0]!.cells.map((cell) =>
            cell.id === pattern.id ? pattern : cell.id === rating.id ? rating : cell,
          ),
        },
      ],
    };
    const moved = relocateNoteBranch(
      relocateNoteBranch(input, 'a1', 'b', 'child'),
      'b1',
      'a',
      'above',
    );
    const cells = moved.chapters[0]!.cells;
    expect(cells.find((cell) => cell.id === pattern.id)).toEqual({ ...pattern, parentId: 'b' });
    const rootRating = { ...rating };
    delete rootRating.parentId;
    expect(cells.find((cell) => cell.id === rating.id)).toEqual(rootRating);
    expect(cells.find((cell) => cell.id === 'a11')?.parentId).toBe('a1');
    expect(parseBearingsNotebook(moved)).toEqual(moved);
  });
  it('keeps legacy headings as ordinary writing in title-free cards', () => {
    expect(
      noteBody({
        ...note('a'),
        title: 'Keep this heading',
        text: 'And this writing.\nA second line.',
      }),
    ).toBe('Keep this heading\n\nAnd this writing.\nA second line.');
    expect(noteBody({ ...note('a'), title: '', text: 'Only writing' })).toBe('Only writing');
  });
  it('adds siblings around whole branches and children inside their parent', () => {
    let doc = insertRelative(fixture(), 'a', 'below', note('between'));
    expect(doc.chapters[0]!.cells.map((c) => c.id)).toEqual([
      'a',
      'a1',
      'a11',
      'a2',
      'between',
      'b',
      'b1',
      'c',
    ]);
    doc = insertRelative(doc, 'a1', 'child', note('new'));
    expect(doc.chapters[0]!.cells.find((c) => c.id === 'new')?.parentId).toBe('a1');
    expect(doc.chapters[0]!.cells.map((c) => c.id)).toEqual([
      'a',
      'a1',
      'a11',
      'new',
      'a2',
      'between',
      'b',
      'b1',
      'c',
    ]);
    expect(parseBearingsNotebook(doc)).toEqual(doc);
  });
  it('moves entire branches up, down, inward and outward without changing their content', () => {
    const doc = fixture();
    expect(moveNoteBranch(doc, 'a', 'ArrowDown').chapters[0]!.cells.map((c) => c.id)).toEqual([
      'b',
      'b1',
      'a',
      'a1',
      'a11',
      'a2',
      'c',
    ]);
    expect(moveNoteBranch(doc, 'b', 'ArrowUp').chapters[0]!.cells.map((c) => c.id)).toEqual([
      'b',
      'b1',
      'a',
      'a1',
      'a11',
      'a2',
      'c',
    ]);
    const nested = moveNoteBranch(doc, 'b', 'ArrowRight');
    expect(nested.chapters[0]!.cells.find((c) => c.id === 'b')?.parentId).toBe('a');
    expect(moveNoteBranch(nested, 'b', 'ArrowLeft')).toEqual(docWithSelection(doc, 'b'));
    expect(moveNoteBranch(doc, 'a', 'ArrowRight')).toBe(doc);
    expect(moveNoteBranch(doc, 'a', 'ArrowLeft')).toBe(doc);
    expect(parseBearingsNotebook(nested)).toEqual(nested);
  });
  it('deletes and restores a subtree, including pattern practice state, and can move it between chapters', () => {
    const doc = fixture();
    doc.chapters[0]!.cells[2] = {
      ...note('a11', 'a1'),
      kind: 'pattern',
      pattern: { sourceId: 'personal', entityId: 'p', title: 'Pattern', summary: '' },
      practice: {
        ref: { sourceId: 'personal', entityId: 'practice' },
        title: 'Practice',
        source: 'source',
        checkpoint: 'keep',
        draft: 'keep draft',
        status: 'in-progress',
      },
    };
    const removed = deleteCell(doc, 'a');
    expect(removed.document.chapters[0]!.cells.map((c) => c.id)).toEqual(['b', 'b1', 'c']);
    expect(removed.document.activeCellId).toBeUndefined();
    const restored = restoreCell(removed.document, removed.removed);
    expect(restored.chapters).toEqual(doc.chapters);
    const two = startChapter(doc, 'Next', 'Beginning', 'second');
    const moved = moveCell(two, 'a', 'second', null);
    expect(moved.chapters[1]!.cells.map((c) => c.id)).toEqual(['a', 'a1', 'a11', 'a2']);
    expect(moved.chapters[1]!.cells[2]?.practice?.checkpoint).toBe('keep');
    expect(parseBearingsNotebook(moved)).toEqual(moved);
  });
  it.each(['next', 'previous'] as const)(
    'merges text %s in reading order, keeping all children',
    (direction) => {
      const doc = fixture();
      const merged = mergeTextNotes(doc, direction === 'next' ? 'a' : 'b', direction);
      const parent = merged.chapters[0]!.cells.find((c) => c.id === merged.activeCellId)!;
      expect(parent.title).toBe('a');
      expect(parent.text).toBe('a text\n\nb\n\nb text');
      expect(
        merged.chapters[0]!.cells.filter((c) => c.parentId === parent.id).map((c) => c.id),
      ).toEqual(['a1', 'a2', 'b1']);
      expect(parseBearingsNotebook(merged)).toEqual(merged);
    },
  );
  it('keeps collapsed descendants out of reading view while preserving the stored tree', () => {
    const cells = fixture().chapters[0]!.cells.map((c) =>
      c.id === 'a1' ? { ...c, collapsed: true } : c,
    );
    expect(visibleOutlineCells(cells).map((c) => c.id)).toEqual(['a', 'a1', 'a2', 'b', 'b1', 'c']);
    expect(outlineCells(cells)).toHaveLength(7);
  });
  it('does not merge away a rating or library reference', () => {
    const doc = fixture();
    doc.chapters[0]!.cells[4] = {
      ...note('b'),
      kind: 'rating',
      rating: { label: 'Confidence', min: 0, max: 10, low: '', high: '', value: 5 },
    };
    expect(() => mergeTextNotes(doc, 'a', 'next')).toThrow('Patterns and ratings');
    expect(ids(doc)).toHaveLength(7);
  });
});
function docWithSelection(doc: ReturnType<typeof fixture>, id: string) {
  return {
    ...doc,
    activeCellId: id,
    chapters: doc.chapters.map((c) => ({
      ...c,
      cells: c.cells.map((n) => (n.id === 'a' ? { ...n, collapsed: false } : n)),
    })),
  };
}

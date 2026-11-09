import { describe, expect, it } from 'vitest';
import {
  emptyBearingsNotebook,
  parseBearingsNotebook,
  type BearingsCell,
} from '@patternverse/workspace';
import { isEmptyTextCell, replaceEmptyLibraryCell, libraryCellFromData } from './library-drop';

describe('copying a library card into a notebook', () => {
  it('copies a pattern reference with fresh identities, without importing parent, answers or practice state', () => {
    const pattern = {
      sourceId: 'commons',
      entityId: 'pause',
      title: 'Pause',
      summary: 'Make some room.',
    };
    const payload = JSON.stringify({
      id: 'library',
      kind: 'pattern',
      text: 'not library content',
      parentId: 'wrong-parent',
      origin: 'wrong-origin',
      pattern,
      practice: { source: 'do not import' },
    });
    const first = libraryCellFromData(payload)!,
      second = libraryCellFromData(payload)!;
    expect(first).toEqual({ id: expect.any(String), kind: 'pattern', text: '', pattern });
    expect(first.id).not.toBe('library');
    expect(first.id).not.toBe(second.id);
  });
  it('preserves an unanswered rating and validates its limits', () => {
    const rating = { label: 'Confidence', min: 0, max: 10, low: 'None', high: 'High', value: null };
    expect(libraryCellFromData(JSON.stringify({ kind: 'rating', rating }))).toMatchObject({
      kind: 'rating',
      text: '',
      rating,
    });
    expect(() =>
      libraryCellFromData(JSON.stringify({ kind: 'rating', rating: { ...rating, max: -1 } })),
    ).toThrow();
  });
  it('ignores empty data and rejects other kinds, malformed references, and oversized payloads', () => {
    expect(libraryCellFromData('')).toBeNull();
    expect(() => libraryCellFromData(JSON.stringify({ kind: 'note', text: 'no' }))).toThrow(
      'pattern or rating',
    );
    expect(() =>
      libraryCellFromData(
        JSON.stringify({ kind: 'pattern', pattern: { title: 'Missing source' } }),
      ),
    ).toThrow();
    expect(() => libraryCellFromData('x'.repeat(50001))).toThrow('too large');
  });
});

describe('replacing an empty placeholder with library content', () => {
  const pattern: BearingsCell = {
    id: 'library-copy',
    kind: 'pattern',
    text: '',
    pattern: { sourceId: 'commons', entityId: 'pause', title: 'Pause', summary: 'Make room.' },
  };
  it('replaces each blank text type in place while preserving chapter, descendants, and selection', () => {
    for (const kind of ['answer', 'note', 'approach'] as const) {
      const original = parseBearingsNotebook({
        ...emptyBearingsNotebook('first'),
        chapters: [
          { id: 'first', title: 'First', collapsed: false, cells: [] },
          {
            id: 'target',
            title: 'Target',
            collapsed: true,
            cells: [
              { id: 'parent', kind: 'answer', text: 'Keep parent' },
              {
                id: 'blank',
                kind,
                text: ' \n ',
                title: ' ',
                parentId: 'parent',
                collapsed: true,
                origin: 'practice-answer',
              },
              { id: 'child', kind: 'note', text: 'Keep child', parentId: 'blank' },
              { id: 'later', kind: 'approach', text: 'Keep later', parentId: 'parent' },
            ],
          },
        ],
      });
      const next = replaceEmptyLibraryCell(original, 'blank', pattern)!;
      expect(next.activeChapterId).toBe('target');
      expect(next.activeCellId).toBe('blank');
      expect(next.chapters[1]!.cells.map((cell) => cell.id)).toEqual([
        'parent',
        'blank',
        'child',
        'later',
      ]);
      expect(next.chapters[1]!.cells[1]).toEqual({
        ...pattern,
        id: 'blank',
        parentId: 'parent',
        collapsed: true,
        origin: 'practice-answer',
      });
      expect(next.chapters[1]!.cells[2]).toBe(original.chapters[1]!.cells[2]);
      expect(original.chapters[1]!.cells[1]!.kind).toBe(kind);
      expect(next.chapters[1]!.collapsed).toBe(false);
      expect(parseBearingsNotebook(next)).toEqual(next);
    }
  });
  it('never treats existing writing, headings, prompts, or widget state as empty', () => {
    const blank: BearingsCell = { id: 'blank', kind: 'answer', text: '' };
    const candidates: BearingsCell[] = [
      { ...blank, text: 'Keep me' },
      { ...blank, title: 'Keep this heading' },
      { ...blank, prompt: 'A question to answer' },
      pattern,
      {
        ...blank,
        kind: 'rating',
        rating: { label: 'Confidence', min: 0, max: 10, low: 'Low', high: 'High', value: null },
      },
      {
        ...blank,
        practice: {
          ref: { sourceId: 'commons', entityId: 'pause' },
          title: 'Practice',
          source: 'source',
          status: 'in-progress',
        },
      },
    ];
    for (const cell of candidates) {
      expect(isEmptyTextCell(cell)).toBe(false);
      const doc = emptyBearingsNotebook();
      expect(
        replaceEmptyLibraryCell(
          { ...doc, chapters: [{ ...doc.chapters[0]!, cells: [cell] }] },
          cell.id,
          pattern,
        ),
      ).toBeNull();
    }
    expect(isEmptyTextCell(undefined)).toBe(false);
    expect(replaceEmptyLibraryCell(emptyBearingsNotebook(), null, pattern)).toBeNull();
  });
  it('also fills blank placeholders with rating cards, retaining unanswered state', () => {
    const doc = emptyBearingsNotebook('one');
    const blank: BearingsCell = { id: 'blank', kind: 'note', text: '' };
    const notebook = { ...doc, chapters: [{ ...doc.chapters[0]!, cells: [blank] }] };
    const rating: BearingsCell = {
      id: 'rating-copy',
      kind: 'rating',
      text: '',
      rating: { label: 'Confidence', min: 0, max: 10, low: 'Low', high: 'High', value: null },
    };
    expect(replaceEmptyLibraryCell(notebook, blank.id, rating)!.chapters[0]!.cells).toEqual([
      { ...rating, id: blank.id },
    ]);
    expect(replaceEmptyLibraryCell(notebook, blank.id, blank)).toBeNull();
  });
});

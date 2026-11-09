import { describe, expect, it } from 'vitest';
import { emptyBearingsNotebook, parseBearingsNotebook } from '@patternverse/workspace';
import {
  insertCell,
  splitTextCell,
  deleteCell,
  restoreCell,
  moveCell,
  startChapter,
  mergeChapters,
  textCell,
  ratingCell,
  recordPractice,
  allCells,
  insertionAfter,
  changeTextCellKind,
  recoverNotebookDraft,
} from './notebook';

describe('Bearings notebook', () => {
  it('inserts beside the active cell, preserving the rest of the chapter', () => {
    const first = textCell('answer', 'First'),
      later = textCell('answer', 'Later');
    const doc = insertCell(insertCell(emptyBearingsNotebook('one'), first), later);
    const target = insertionAfter(doc, first.id);
    const middle = textCell('note', 'Between');
    const next = insertCell(doc, middle, target.chapterId, target.beforeId);
    expect(allCells(next).map((cell) => cell.text)).toEqual(['First', 'Between', 'Later']);
    expect(insertionAfter(next, null)).toEqual({ chapterId: 'one', beforeId: null });
    expect(allCells(changeTextCellKind(next, middle.id, 'approach'))[1]).toMatchObject({
      id: middle.id,
      kind: 'approach',
      text: 'Between',
    });
    const rating = ratingCell('Tension');
    expect(() => changeTextCellKind(insertCell(next, rating), rating.id, 'note')).toThrow(
      'Only text cells',
    );
  });
  it('splits a text cell into a sibling while preserving its type, title, prompt, and child branch', () => {
    const doc = parseBearingsNotebook({
      ...emptyBearingsNotebook('one'),
      chapters: [
        {
          id: 'one',
          title: 'Beginning',
          collapsed: false,
          cells: [
            { id: 'parent', kind: 'answer', text: 'Parent' },
            {
              id: 'source',
              kind: 'note',
              text: 'Opening\n---\nClosing',
              title: 'Legacy heading',
              prompt: 'Why?',
              origin: 'practice-answer',
              parentId: 'parent',
            },
            { id: 'child', kind: 'answer', text: 'Keep child', parentId: 'source' },
            { id: 'later', kind: 'approach', text: 'Keep later', parentId: 'parent' },
          ],
        },
      ],
    });
    const next = splitTextCell(doc, 'source', 'Opening', 'Closing');
    const cells = allCells(next);
    expect(cells.map((cell) => cell.id)).toEqual([
      'parent',
      'source',
      'child',
      next.activeCellId,
      'later',
    ]);
    expect(cells[1]).toMatchObject({
      text: 'Opening',
      title: 'Legacy heading',
      prompt: 'Why?',
      origin: 'practice-answer',
    });
    expect(cells[2]).toEqual(allCells(doc)[2]);
    expect(cells[3]).toEqual({
      id: next.activeCellId,
      kind: 'note',
      text: 'Closing',
      parentId: 'parent',
    });
    expect(parseBearingsNotebook(next)).toEqual(next);
    expect(allCells(doc)[1]!.text).toBe('Opening\n---\nClosing');
    const plain = splitTextCell(doc, 'source', 'Legacy heading\n\nOpening', 'Closing', true);
    expect(allCells(plain)[1]!.title).toBeUndefined();
    expect(allCells(plain)[1]!.text).toBe('Legacy heading\n\nOpening');
    expect(() => splitTextCell(doc, 'missing', '', '')).toThrow('Only text cells');
    const rating = ratingCell('Tension');
    expect(() => splitTextCell(insertCell(doc, rating), rating.id, '', '')).toThrow(
      'Only text cells',
    );
  });
  it('recovers a legacy draft exactly once, retaining its type, whitespace, and surrounding cells', () => {
    const existing = textCell('answer', 'Already saved');
    const doc = {
      ...insertCell(emptyBearingsNotebook('one'), existing),
      draft: '  Keep this unfinished thought.\n',
      draftKind: 'note' as const,
    };
    const recovered = recoverNotebookDraft(doc);
    expect(recovered.draft).toBe('');
    expect(allCells(recovered)).toHaveLength(2);
    expect(allCells(recovered)[1]).toMatchObject({ kind: 'note', text: doc.draft });
    expect(allCells(recovered)[0]).toEqual(existing);
    expect(recoverNotebookDraft(recovered)).toBe(recovered);
    expect(parseBearingsNotebook(recovered)).toEqual(recovered);
  });
  it('moves across chapters, merges in reading order, and restores deleted cells', () => {
    const first = textCell('answer', 'First'),
      second = textCell('note', 'Note'),
      own = textCell('approach', 'Try this');
    let doc = insertCell(insertCell(emptyBearingsNotebook('one'), first), second);
    doc = startChapter(doc, 'Next', 'Beginning', 'two');
    doc = insertCell(doc, own);
    doc = moveCell(doc, second.id, 'two', own.id);
    expect(doc.chapters.map((c) => c.cells.map((c) => c.text))).toEqual([
      ['First'],
      ['Note', 'Try this'],
    ]);
    const deleted = deleteCell(doc, second.id);
    doc = restoreCell(deleted.document, deleted.removed);
    doc = mergeChapters(doc, 'one', 'two');
    expect(doc.chapters).toHaveLength(1);
    expect(allCells(doc).map((c) => c.text)).toEqual(['First', 'Note', 'Try this']);
    expect(parseBearingsNotebook(doc)).toEqual(doc);
  });
  it('does not invent a rating before the slider has been used', () => {
    expect(ratingCell('Distress', 0, 100).rating?.value).toBeNull();
  });
  it('copies confirmed practice responses once and preserves intentional edits and deletions on restore', () => {
    const practice = {
      ref: { sourceId: 'commons', entityId: 'practice' },
      title: 'Practice',
      source: ':language 1',
      status: 'in-progress' as const,
    };
    const pattern = {
      id: 'pattern-cell',
      kind: 'pattern' as const,
      text: '',
      pattern: { sourceId: 'commons', entityId: 'example', title: 'Example', summary: '' },
      practice,
    };
    let doc = insertCell(emptyBearingsNotebook('one'), pattern);
    const responses = [{ id: 'a', prompt: 'What helps?', answer: 'Walking' }];
    doc = recordPractice(doc, pattern.id, practice, responses, 'run');
    const answer = allCells(doc)[1]!;
    doc = deleteCell(doc, answer.id).document;
    doc = recordPractice(doc, pattern.id, practice, responses, 'run');
    expect(allCells(doc)).toHaveLength(1);
    expect(
      parseBearingsNotebook(doc).chapters[0]?.cells[0]?.practice?.copiedResponseIds,
    ).toHaveLength(1);
  });
  it('places confirmed practice answers beside their source without displacing later notes', () => {
    const practice = {
      ref: { sourceId: 'commons', entityId: 'practice' },
      title: 'Practice',
      source: ':language 1',
      status: 'in-progress' as const,
    };
    const pattern = {
      id: 'source',
      kind: 'pattern' as const,
      text: '',
      pattern: { sourceId: 'commons', entityId: 'pattern', title: 'Pattern', summary: '' },
      practice,
    };
    const later = textCell('note', 'Later note');
    let doc = insertCell(insertCell(emptyBearingsNotebook('one'), pattern), later);
    doc = recordPractice(
      doc,
      pattern.id,
      practice,
      [{ id: 'one', prompt: 'First?', answer: 'First answer' }],
      'run',
    );
    doc = recordPractice(
      doc,
      pattern.id,
      practice,
      [
        { id: 'one', prompt: 'First?', answer: 'First answer' },
        { id: 'two', prompt: 'Second?', answer: 'Second answer' },
      ],
      'run',
    );
    expect(allCells(doc).map((cell) => cell.text)).toEqual([
      '',
      'First answer',
      'Second answer',
      'Later note',
    ]);
  });
});

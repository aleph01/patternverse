import { describe, expect, it } from 'vitest';
import type { BearingsCell as Cell } from '@patternverse/workspace';
import { treeColumns, treePositions } from './tree-layout';
import { childCells } from './outline';
const note = (id: string, parentId?: string): Cell => ({ id, parentId, kind: 'answer', text: id });
const cells = [
  note('a'),
  note('a1', 'a'),
  note('a11', 'a1'),
  note('a2', 'a'),
  note('a21', 'a2'),
  note('a22', 'a2'),
  note('b'),
  note('b1', 'b'),
];

describe('complete tree layout', () => {
  it('shows children from every parent in reading order at the same depth', () => {
    expect(treeColumns(cells).map((column) => column.map((cell) => cell.id))).toEqual([
      ['a', 'b'],
      ['a1', 'a2', 'b1'],
      ['a11', 'a21', 'a22'],
    ]);
  });
  it('centers each parent on its children without overlapping any cards as their heights change', () => {
    for (const tall of cells) {
      const heights = new Map(cells.map((cell) => [cell.id, cell.id === tall.id ? 580 : 108]));
      const { positions, height } = treePositions(cells, heights);
      for (const column of treeColumns(cells))
        for (let i = 0; i < column.length; i++) {
          const cell = column[i]!;
          expect(positions.get(cell.id)!).toBeGreaterThanOrEqual(0);
          expect(positions.get(cell.id)! + heights.get(cell.id)!).toBeLessThanOrEqual(height);
          if (i) {
            const previous = column[i - 1]!;
            expect(positions.get(cell.id)!).toBeGreaterThanOrEqual(
              positions.get(previous.id)! + heights.get(previous.id)!,
            );
          }
          const kids = childCells(cells, cell.id);
          if (kids.length) {
            const center = positions.get(cell.id)! + heights.get(cell.id)! / 2;
            const groupCenter =
              (positions.get(kids[0]!.id)! +
                positions.get(kids.at(-1)!.id)! +
                heights.get(kids.at(-1)!.id)!) /
              2;
            expect(center).toBe(groupCenter);
          }
        }
    }
  });
  it('handles an empty notebook', () => {
    expect(treeColumns([])).toEqual([]);
    expect(treePositions([], new Map())).toEqual({ positions: new Map(), height: 0 });
  });
});

import type { BearingsCell as Cell } from '@patternverse/workspace';
import { outlineCells } from './outline';

/** Keep every family visible in depth columns, independent of the current selection. */
export function treeColumns(cells: readonly Cell[]): Cell[][] {
  const depths = new Map<string, number>();
  const columns: Cell[][] = [];
  for (const cell of outlineCells(cells)) {
    const depth = cell.parentId ? (depths.get(cell.parentId) ?? 0) + 1 : 0;
    depths.set(cell.id, depth);
    (columns[depth] ??= []).push(cell);
  }
  return columns;
}

/** Reserve room for each complete subtree. Center each parent on its direct children,
 * while preserving natural card heights and keeping adjacent leaf siblings together. */
export function treePositions(cells: readonly Cell[], heights: ReadonlyMap<string, number>) {
  const ordered = outlineCells(cells);
  const children = new Map<string | undefined, Cell[]>();
  for (const cell of ordered) {
    const group = children.get(cell.parentId) ?? [];
    group.push(cell);
    children.set(cell.parentId, group);
  }
  const metrics = new Map<string, { span: number; top: number; childrenTop: number }>();
  const height = (id: string) => heights.get(id) ?? 108;
  for (const cell of [...ordered].reverse()) {
    const kids = children.get(cell.id) ?? [];
    const first = kids[0],
      last = kids.at(-1);
    if (!first || !last) {
      metrics.set(cell.id, { span: height(cell.id), top: 0, childrenTop: 0 });
      continue;
    }
    const total = kids.reduce((sum, child) => sum + metrics.get(child.id)!.span, 0);
    const lastMetric = metrics.get(last.id)!;
    const bottom = total - lastMetric.span + lastMetric.top + height(last.id);
    const top = (metrics.get(first.id)!.top + bottom - height(cell.id)) / 2;
    const shift = Math.max(0, -top);
    metrics.set(cell.id, {
      span: Math.max(total, top + height(cell.id)) + shift,
      top: top + shift,
      childrenTop: shift,
    });
  }
  const positions = new Map<string, number>();
  const pending: { cell: Cell; base: number }[] = [];
  let total = 0;
  for (const cell of children.get(undefined) ?? []) {
    pending.push({ cell, base: total });
    total += metrics.get(cell.id)!.span;
  }
  while (pending.length) {
    const { cell, base } = pending.pop()!;
    const metric = metrics.get(cell.id)!;
    positions.set(cell.id, base + metric.top);
    let childBase = base + metric.childrenTop;
    for (const child of children.get(cell.id) ?? []) {
      pending.push({ cell: child, base: childBase });
      childBase += metrics.get(child.id)!.span;
    }
  }
  return { positions, height: total };
}

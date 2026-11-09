import { expect, it } from 'vitest';
import type { Situation } from '@patternverse/workspace';
import { layoutSituations, mapBounds, relationFor, editedConnection } from './graph';
const situation = (id: string, parents: string[] = [], position = 0): Situation => ({
  id,
  title: id,
  context: '',
  workspaceId: 'workspace',
  position,
  revision: 0,
  createdAt: '2026-01-01',
  updatedAt: '2026-01-01',
  connections: parents.map((targetId) => ({ targetId, kind: 'part-of' })),
});
it('lays out shared subproblems beneath all their parents and preserves manual positions', () => {
  const all = [
    situation('root'),
    situation('other'),
    situation('middle', ['root']),
    situation('shared', ['middle', 'other']),
    { ...situation('manual'), mapPosition: { x: 800, y: 450 } },
  ];
  const layout = layoutSituations(all),
    positions = new Map(layout.map((n) => [n.situation.id, n.position]));
  expect(positions.get('shared')!.y).toBeGreaterThan(positions.get('middle')!.y);
  expect(positions.get('shared')!.y).toBeGreaterThan(positions.get('other')!.y);
  expect(positions.get('manual')).toEqual({ x: 800, y: 450 });
  expect(layoutSituations(all)).toEqual(layout);
  expect(mapBounds(layout).width).toBeGreaterThan(800);
});
it('keeps part-of direction consistent when editing from either end', () => {
  const edge = editedConnection('parent', 'child', 'contains');
  expect(edge).toEqual({ sourceId: 'child', targetId: 'parent', kind: 'part-of' });
  expect(relationFor(edge, 'child')).toBe('part-of');
  expect(relationFor(edge, 'parent')).toBe('contains');
  expect(editedConnection('a', 'b', 'related').kind).toBe('related');
});

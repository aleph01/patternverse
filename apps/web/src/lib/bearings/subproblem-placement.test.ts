import { expect, it } from 'vitest';
import type { Situation } from '@patternverse/workspace';
import { isMapSpaceFree, nearbySubproblemPosition, type MapNode } from './graph';

const node = (x: number, y: number): MapNode => ({
  position: { x, y },
  situation: {} as Situation,
});
it('keeps click-created subproblems clear of existing cards and their hit areas', () => {
  const parent = node(70, 70),
    occupied = node(70, 238),
    nodes = [parent, occupied];
  expect(isMapSpaceFree({ x: 70, y: 70 }, nodes)).toBe(false);
  expect(isMapSpaceFree({ x: 70, y: 176 }, nodes)).toBe(false);
  const position = nearbySubproblemPosition(parent.position, nodes)!;
  expect(position.y).toBeGreaterThan(occupied.position.y + 104);
  expect(isMapSpaceFree(position, nodes)).toBe(true);
});

it('offers a valid nearby placement at the lower map boundary', () => {
  const parent = node(100000, 100000),
    nodes = [parent];
  const position = nearbySubproblemPosition(parent.position, nodes)!;
  expect(position.y).toBeGreaterThanOrEqual(0);
  expect(position.y).toBeLessThan(100000);
  expect(isMapSpaceFree(position, nodes)).toBe(true);
});

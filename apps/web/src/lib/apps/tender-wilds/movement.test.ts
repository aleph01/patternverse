import { expect, it } from 'vitest';
import { moveBird } from './movement';
it('keeps diagonal speed equal to straight movement', () => {
  const origin = { x: 300, y: 300 };
  const straight = moveBird(origin, { x: 1, y: 0 }, 0.02);
  const diagonal = moveBird(origin, { x: 1, y: 1 }, 0.02);
  expect(straight.x - origin.x).toBe(3);
  expect(Math.hypot(diagonal.x - origin.x, diagonal.y - origin.y)).toBeCloseTo(3);
});
it('stops at shore boundaries and does not jump after a suspended frame', () => {
  expect(moveBird({ x: 514, y: 524 }, { x: 1, y: 1 }, 10)).toEqual({ x: 515, y: 525 });
  expect(moveBird({ x: 300, y: 300 }, { x: 1, y: 0 }, 100)).toEqual({ x: 306, y: 300 });
  expect(moveBird({ x: 80, y: 105 }, { x: -1, y: -1 }, 0.02)).toEqual({ x: 80, y: 105 });
});

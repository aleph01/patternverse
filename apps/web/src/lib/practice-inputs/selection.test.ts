import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { moveSelection, selectionWithinBounds } from './selection';

describe('selection input affordances', () => {
  it('uses inclusive minimum/maximum counts and permits an optional empty selection', () => {
    expect(selectionWithinBounds([], 0, 3)).toBe(true);
    expect(selectionWithinBounds([], 1, 3)).toBe(false);
    expect(selectionWithinBounds(['a'], 1, 1)).toBe(true);
    expect(selectionWithinBounds(['a', 'b'], 1, 1)).toBe(false);
  });

  it('never mutates, loses, or duplicates ranked values across generated moves', () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.string()),
        fc.integer(),
        fc.constantFrom(-1 as const, 1 as const),
        (values, index, delta) => {
          const original = [...values];
          const moved = moveSelection(values, index, delta);
          expect(values).toEqual(original);
          expect([...moved].sort()).toEqual([...original].sort());
          if (
            index >= 0 &&
            index < values.length &&
            index + delta >= 0 &&
            index + delta < values.length
          )
            expect(moveSelection(moved, index + delta, delta === 1 ? -1 : 1)).toEqual(original);
          else expect(moved).toEqual(original);
        },
      ),
      { numRuns: 300 },
    );
  });
});

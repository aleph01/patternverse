import { describe, expect, it } from 'vitest';
import { drumSubdivision, subdivisionCount } from './rhythm-grid';
import type { Note } from './model';
const notes = (...starts: number[]): Note[] =>
  starts.map((start) => ({
    start,
    midi: 36,
    pitch: 'C2',
    duration: 0.1,
    part: 'kick',
    drum: 'kick',
  }));
describe('drum reading grid', () => {
  it('keeps eighths, sixteenths and triplets distinct and scopes the grid to the visible bar', () => {
    expect(drumSubdivision(notes(0, 0.5, 1), 0, 4)).toBe(2);
    expect(drumSubdivision(notes(0, 0.75, 1.5), 0, 4)).toBe(4);
    expect(drumSubdivision(notes(0, 2 / 3), 0, 4)).toBe(3);
    expect(drumSubdivision(notes(0, 0.75, 2 / 3, 5 / 6), 0, 4)).toBe(12);
    expect(drumSubdivision(notes(0, 0.5, 4.75), 0, 4)).toBe(2);
  });
  it('labels sixteenths and mixed subdivisions compactly without changing their note positions', () => {
    expect([0, 0.25, 0.5, 0.75, 1].map((t) => subdivisionCount(t, 4))).toEqual([
      '1',
      'e',
      '&',
      'a',
      '2',
    ]);
    expect(subdivisionCount(2 / 3, 12)).toBe('⅔');
    expect(subdivisionCount(5 / 6, 12)).toBe('⅚');
  });
});

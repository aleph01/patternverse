import { describe, expect, it } from 'vitest';
import { mergeApprovedMarks } from './studio-server';
import { defaultPatternMark } from '../../lib/illustrations/pattern-mark-presets';
import type { MarkProject } from '../../lib/illustrations/pattern-marks';

const first = defaultPatternMark('observer', 'Observer');
const second = defaultPatternMark('builder', 'Builder');
const project = (marks: MarkProject['marks']): MarkProject => ({
  kind: 'patternverse-marks',
  version: 2,
  marks,
});
describe('Private studio registry merge', () => {
  it('applies explicit updates, preserves other recipes and stores no private draft', () => {
    const merged = mergeApprovedMarks(
      project([first, second]),
      { ...project([{ ...first, variation: 7 }]), draft: second },
      new Set(['observer', 'builder']),
    );
    expect(merged.marks).toEqual([second, { ...first, variation: 7 }]);
    expect(merged).not.toHaveProperty('draft');
  });
  it('rejects nonexistent IDs without modifying input', () => {
    const current = project([first]);
    expect(() => mergeApprovedMarks(current, project([second]), new Set(['observer']))).toThrow(
      /public library/,
    );
    expect(current.marks).toEqual([first]);
  });
});

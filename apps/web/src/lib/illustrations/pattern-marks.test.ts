import { describe, expect, it } from 'vitest';
import {
  generatePatternMark,
  isPatternMarkSpec,
  parseMarkProject,
  patternMarkSvg,
  similarSavedMarks,
  type PatternMarkSpec,
} from './pattern-marks';
import { defaultPatternMark, patternIconForPattern } from './pattern-mark-presets';
const spec: PatternMarkSpec = {
  patternId: 'test-pattern',
  title: 'Test pattern',
  generatorVersion: 1,
  variation: 0,
  rotation: 0,
};
const project = (marks: readonly PatternMarkSpec[]) =>
  JSON.stringify({ kind: 'patternverse-marks', version: 2, marks });
describe('Portable grid-icon recipes', () => {
  it('uses slug only unless the author explicitly chooses a family or variation', () => {
    expect(generatePatternMark(spec)).toEqual(generatePatternMark({ ...spec, title: 'Renamed' }));
    expect(defaultPatternMark('observer', 'Observer')).not.toHaveProperty('familyHint');
    expect(generatePatternMark(defaultPatternMark('observer', 'A new title'))).toEqual(
      generatePatternMark(defaultPatternMark('observer', 'Observer')),
    );
    expect(
      new Set(
        Array.from({ length: 30 }, (_, variation) =>
          JSON.stringify(generatePatternMark({ ...spec, variation })),
        ),
      ).size,
    ).toBeGreaterThan(15);
  });
  it('exports escaped accessible SVG, transparent by default, with no IDs or external references', () => {
    const svg = patternMarkSvg({ ...spec, title: '<script>&"' });
    expect(svg).toContain('&lt;script&gt;&amp;&quot;');
    expect(svg).not.toContain('<script>');
    expect(svg).not.toContain('var(');
    expect(svg).not.toMatch(/\bid=|href=|url\(/);
    expect(svg).toContain('viewBox="0 0 72 72"');
    expect(patternMarkSvg(spec, false)).toContain('fill="#fff"');
  });
  it('excludes the current pattern from similarity warnings', () => {
    const duplicate = { ...spec, patternId: 'other-pattern' };
    // Different identities need not collide: compare deterministic known similar marks instead.
    const matches = Array.from({ length: 100 }, (_, i) => ({
      ...duplicate,
      patternId: `other-${i}`,
    }));
    expect(similarSavedMarks(spec, [spec, ...matches])).not.toContain(spec);
  });
  it('supports content IDs and titles beyond the private studio recipe limits', () => {
    expect(patternIconForPattern('a'.repeat(240), 'Long title '.repeat(50)).cells).toHaveLength(9);
    expect(patternIconForPattern('observer', 'Long title '.repeat(50))).toEqual(
      patternIconForPattern('observer', 'Observer'),
    );
  });
  it('round-trips a bounded whitelist and rejects malformed or duplicate recipes', () => {
    expect(parseMarkProject(project([spec])).marks).toEqual([spec]);
    expect(
      parseMarkProject(project([{ ...spec, extra: 'ignored' } as PatternMarkSpec])).marks[0],
    ).not.toHaveProperty('extra');
    for (const invalid of [
      { patternId: '../file' },
      { variation: -1 },
      { variation: 1.5 },
      { rotation: '90' },
      { generatorVersion: 2 },
      { familyHint: 'free' },
      { title: '' },
    ]) {
      expect(isPatternMarkSpec({ ...spec, ...invalid })).toBe(false);
      expect(() =>
        parseMarkProject(project([{ ...spec, ...invalid } as PatternMarkSpec])),
      ).toThrow();
    }
    expect(() => parseMarkProject(project([spec, spec]))).toThrow(/duplicate/);
    expect(() => parseMarkProject(' '.repeat(262145))).toThrow(/large/);
    expect(() => parseMarkProject(project(Array(201).fill(spec)))).toThrow();
  });
  it('preserves legacy projects until explicitly imported, then regenerates rather than reproducing old shapes', () => {
    const old = JSON.stringify({
      kind: 'patternverse-marks',
      version: 1,
      marks: [
        { ...spec, generatorVersion: undefined, motif: 'branching', style: 'mixed', accent: true },
      ],
    });
    expect(() => parseMarkProject(old)).toThrow(/explicitly/);
    expect(parseMarkProject(old, true)).toEqual({
      kind: 'patternverse-marks',
      version: 2,
      marks: [spec],
    });
    expect(() =>
      parseMarkProject(JSON.stringify({ kind: 'patternverse-marks', version: '2', marks: [] })),
    ).toThrow();
  });
});

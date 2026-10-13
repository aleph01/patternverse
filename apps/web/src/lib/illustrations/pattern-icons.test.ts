import { describe, expect, it } from 'vitest';
import {
  COMPOSITION_FAMILIES,
  ICON_CANDIDATE_COUNT,
  generateIconCandidates,
  generatePatternIcon,
  iconSimilarity,
  isPatternIcon,
  scorePatternIcon,
  transformIcon,
  type PatternIcon,
} from './pattern-icons';
import {
  QUARTER_CIRCLE_PATH,
  quarterTransform,
  patternIconSvg,
  iconCellPath,
} from './pattern-icon-svg';

describe('Deterministic 3×3 grammar', () => {
  it('is reproducible, versioned, serializable and independent of generation order', () => {
    const first = generatePatternIcon('stable-pattern');
    generatePatternIcon('different-pattern');
    expect(generatePatternIcon('stable-pattern', { version: 1 })).toEqual(first);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(Object.isFrozen(first.cells[0])).toBe(true);
    expect(generatePatternIcon('café')).toEqual(generatePatternIcon('cafe\u0301'));
    expect(() => generatePatternIcon('')).toThrow();
    expect(() => generatePatternIcon('x', { version: 2 } as never)).toThrow(/version/);
    expect(() => generatePatternIcon('x', { variation: NaN })).toThrow();
    expect(() => generatePatternIcon('x', { familyHint: 'triangle' } as never)).toThrow();
    expect(generateIconCandidates('stable-pattern')).toHaveLength(ICON_CANDIDATE_COUNT);
  });
  it('uses exact radius-one-cell quarter disks, not bezier approximations or independent larger shapes', () => {
    expect(QUARTER_CIRCLE_PATH).toBe('M0 0 H24 A24 24 0 0 1 0 24 Z');
    for (const rotation of [0, 90, 180, 270] as const) {
      expect(quarterTransform(rotation)).toBe(`rotate(${rotation} 12 12)`);
      const icon: PatternIcon = {
        version: 1,
        family: 'anchor',
        cells: Array.from({ length: 9 }, () => ({ shape: 'quarter', rotation, color: 'primary' })),
      };
      const svg = patternIconSvg(icon);
      expect((svg.match(/<path /g) ?? []).length).toBe(1);
      expect((svg.match(/A24 24 0 0 1/g) ?? []).length).toBe(9);
      expect(svg).not.toMatch(/<circle|<line|<polygon|stroke=|rx=|\bid=|clipPath|filter=/);
    }
    const a = generatePatternIcon('orientations');
    expect(transformIcon(transformIcon(a, 90), 270)).toEqual(a);
    expect(transformIcon(transformIcon(a, 0, true), 0, true)).toEqual(a);
    expect(iconCellPath({ shape: 'quarter', rotation: 0, color: 'primary' }, 0)).toBe(
      'M0 0L24 0A24 24 0 0 1 0 24Z',
    );
    expect(iconCellPath({ shape: 'quarter', rotation: 90, color: 'primary' }, 0)).toBe(
      'M24 0L24 24A24 24 0 0 1 0 0Z',
    );
    expect(iconCellPath({ shape: 'quarter', rotation: 180, color: 'primary' }, 0)).toBe(
      'M24 24L0 24A24 24 0 0 1 24 0Z',
    );
    expect(iconCellPath({ shape: 'quarter', rotation: 270, color: 'primary' }, 0)).toBe(
      'M0 24L0 0A24 24 0 0 1 24 24Z',
    );
    expect(iconCellPath({ shape: 'quarter', rotation: 0, color: 'primary' }, 8)).toBe(
      'M48 48L72 48A24 24 0 0 1 48 72Z',
    );
    expect(iconCellPath({ shape: 'square', color: 'primary' }, 8)).toBe('M48 48h24v24h-24Z');
  });
  it.each(COMPOSITION_FAMILIES)(
    'keeps $label compositions within the geometry and color budget',
    (family) => {
      for (let i = 0; i < 50; i++) {
        const icon = generatePatternIcon(`constraint-${i}`, { familyHint: family.id });
        expect(isPatternIcon(icon)).toBe(true);
        expect(icon.family).toBe(family.id);
        const filled = icon.cells.filter((c) => c.shape !== 'empty');
        expect(filled.length).toBeGreaterThanOrEqual(3);
        expect(filled.length).toBeLessThanOrEqual(7);
        expect(filled.filter((c) => c.shape === 'square').length).toBeLessThanOrEqual(2);
        expect(
          filled.filter((c) => c.color === 'accent' || c.color === 'purple').length,
        ).toBeLessThanOrEqual(2);
        expect(filled.filter((c) => c.color === 'secondary').length).toBeLessThanOrEqual(2);
        expect(filled.some((c) => c.color === 'primary')).toBe(true);
        expect(scorePatternIcon(icon).connectivity).toBeGreaterThanOrEqual(0.6);
        expect(scorePatternIcon(icon).colorHierarchy).toBe(1);
      }
    },
  );
  it('has useful diversity across a few hundred slugs, without requiring every icon to be unique', () => {
    const icons = Array.from({ length: 400 }, (_, i) => generatePatternIcon(`sample-${i}`));
    expect(new Set(icons.map((i) => JSON.stringify(i.cells))).size).toBeGreaterThan(260);
    expect(new Set(icons.map((i) => i.family)).size).toBe(10);
    const accents = icons.map(
      (i) =>
        i.cells.filter((c) => c.shape !== 'empty' && (c.color === 'accent' || c.color === 'purple'))
          .length,
    );
    expect(accents.filter((n) => n === 1).length).toBeGreaterThan(300);
    expect(accents).toContain(0);
    expect(accents).toContain(2);
    expect(
      icons.filter((icon) => icon.cells.some((c) => c.shape !== 'empty' && c.color === 'purple'))
        .length,
    ).toBeGreaterThan(40);
    expect(
      icons.filter((icon) => icon.cells.some((c) => c.shape !== 'empty' && c.color === 'accent'))
        .length,
    ).toBeGreaterThan(200);
  });
  it('compares geometry, occupied area and colors under all rotations and reflections', () => {
    const a = generatePatternIcon('similarity-a');
    expect(iconSimilarity(a, a)).toBeCloseTo(1);
    for (const mirror of [false, true])
      for (const rotation of [0, 90, 180, 270] as const)
        expect(iconSimilarity(a, transformIcon(a, rotation, mirror))).toBeCloseTo(1);
    const recolored: PatternIcon = {
      ...a,
      cells: a.cells.map((c) =>
        c.shape === 'empty' ? c : { ...c, color: c.color === 'accent' ? 'primary' : 'accent' },
      ),
    };
    expect(iconSimilarity(a, recolored)).toBeLessThan(1);
    for (let i = 0; i < 30; i++) {
      const b = generatePatternIcon(`comparison-${i}`),
        value = iconSimilarity(a, b);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
      expect(value).toBeCloseTo(iconSimilarity(b, a));
    }
    expect(isPatternIcon({ ...a, cells: a.cells.slice(1) })).toBe(false);
    expect(
      isPatternIcon({ ...a, cells: Array(9).fill({ shape: 'circle', color: 'accent' }) }),
    ).toBe(false);
  });
});

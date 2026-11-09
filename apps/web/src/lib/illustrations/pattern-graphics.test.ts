// @vitest-environment jsdom

import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseMarkdownEntity } from '@patternverse/compiler';
import {
  PATTERN_GRAPHICS,
  UNASSIGNED_GRAPHIC,
  findPatternGraphic,
  isPatternGraphic,
  patternGraphicForPattern,
  patternGraphicSvg,
} from './pattern-graphics';
import { patternIconForPattern } from './pattern-mark-presets';

describe('Authored concept graphics', () => {
  it('covers published patterns and authored drafts with explicit, explained compositions', () => {
    const directory = resolve(process.cwd(), '../../content/patterns');
    const files = readdirSync(directory).filter((name) => name.endsWith('.md'));
    const ids = files.flatMap((name) => {
      const source = readFileSync(resolve(directory, name), 'utf8');
      // This contract compares metadata; avoid parsing every article and practice body.
      const frontmatter = source.match(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/)?.[0];
      expect(frontmatter, name).toBeDefined();
      const parsed = parseMarkdownEntity(frontmatter ?? '', {
        sourceId: 'commons',
        sourcePath: name,
      });
      expect(
        parsed.diagnostics.filter(({ severity }) => severity === 'error'),
        name,
      ).toEqual([]);
      expect(parsed.entity, name).toBeDefined();
      const { id, summary, status } = parsed.entity!;
      const graphic = findPatternGraphic(id);
      if (status === 'draft' && !graphic) {
        expect(patternGraphicForPattern(id)).toBe(UNASSIGNED_GRAPHIC);
        return [];
      }
      expect(graphic, `Missing authored graphic for ${id}`).toBeDefined();
      expect(graphic!.mechanism, `Review the design brief after changing ${id}`).toBe(summary);
      expect(graphic!.reading.length).toBeGreaterThan(35);
      expect(graphic!.motif).not.toBe('unassigned');
      return [id];
    });
    expect(PATTERN_GRAPHICS.map((g) => g.id).sort()).toEqual(ids.sort());
  });

  it('uses bounded path geometry, ink, and a single accent hue for every authored graphic', () => {
    for (const graphic of PATTERN_GRAPHICS) {
      expect(isPatternGraphic(graphic), graphic.id).toBe(true);
      const paints = graphic.paths.flatMap((p) => [p.fill, p.stroke]);
      expect(paints, graphic.id).toContain('primary');
      expect(new Set(paints.filter((p) => p === 'accent' || p === 'purple')).size, graphic.id).toBe(
        1,
      );
      expect(Object.isFrozen(graphic.paths)).toBe(true);
      expect(Object.isFrozen(graphic.paths[0])).toBe(true);
    }
  });

  it('preserves the approved first-pass compositions instead of the literal-object studies', () => {
    const paths = findPatternGraphic('reframing-alternative-paths')!.paths;
    expect(paths.slice(0, 3).map((p) => p.d)).toEqual([
      'M18 48 C32 48 26 20 48 20 S64 48 78 48',
      'M18 48 C32 48 26 76 48 76 S64 48 78 48',
      'M18 48 H78',
    ]);
    expect(findPatternGraphic('drill-the-bottleneck')!.paths).toHaveLength(3);
    expect(findPatternGraphic('separate-observation-meaning-and-action')!.paths.at(-1)?.fill).toBe(
      'purple',
    );
    expect(findPatternGraphic('reframing-look-outside-frame')!.paths[0].d).toBe(
      'M57 32 H16 V80 H64 V47',
    );
  });

  it('keeps artwork stable across renaming, lookup order, and repeated use', () => {
    const before = patternIconForPattern('observer', 'Observer');
    for (const graphic of [...PATTERN_GRAPHICS].reverse()) patternGraphicForPattern(graphic.id);
    expect(patternIconForPattern('observer', 'Renamed')).toBe(before);
    expect(patternGraphicForPattern('__proto__')).toBe(UNASSIGNED_GRAPHIC);
    expect(patternGraphicForPattern('a-new-private-pattern')).toBe(UNASSIGNED_GRAPHIC);
    expect(isPatternGraphic(UNASSIGNED_GRAPHIC)).toBe(true);
  });

  it('exports portable transparent SVG with escaped accessible text and no executable markup', () => {
    const graphic = findPatternGraphic('observer')!;
    const svg = patternGraphicSvg({ ...graphic, reading: '<script>&"' }, '<script>&"');
    expect(svg).toContain('viewBox="0 0 96 96"');
    expect(svg).toContain('<title>&lt;script&gt;&amp;&quot;</title>');
    expect(svg).toContain('<desc>&lt;script&gt;&amp;&quot;</desc>');
    expect(svg).not.toMatch(/<script>|\bid=|href=|url\(|var\(|<rect/);
    for (const patch of [
      { d: 'M0 0" onload="alert(1)' },
      { fill: 'url(https://example.com)' },
      { transform: 'rotate(90)' },
      { strokeWidth: NaN },
      { linecap: 'invalid' },
    ]) {
      const malformed = { ...graphic, paths: [{ ...graphic.paths[0], ...patch }] };
      expect(isPatternGraphic(malformed)).toBe(false);
      expect(() => patternGraphicSvg(malformed as typeof graphic)).toThrow();
    }
  });
});

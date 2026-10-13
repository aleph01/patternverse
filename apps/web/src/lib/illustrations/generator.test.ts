import { describe, expect, it } from 'vitest';
import {
  COLORS,
  COMPOSITIONS,
  FORMATS,
  PALETTES,
  SHAPES,
  generateIllustration,
  illustrationSvg,
  type Format,
  type Palette,
} from './generator';

describe('geometric illustration language', () => {
  it('reproduces seeds and changes each next variation', () => {
    for (const { id } of COMPOSITIONS) {
      const first = generateIllustration(id, 'mint', 'landscape', 1);
      expect(generateIllustration(id, 'mint', 'landscape', 1)).toEqual(first);
      expect(generateIllustration(id, 'mint', 'landscape', 2)).not.toEqual(first);
    }
  });

  it('keeps the allowed shapes and colors inside every canvas', () => {
    for (const { id } of COMPOSITIONS) {
      for (const palette of Object.keys(PALETTES) as Palette[]) {
        for (const format of Object.keys(FORMATS) as Format[]) {
          for (const seed of [1, 2, 3, 42, 999999, NaN]) {
            const art = generateIllustration(id, palette, format, seed);
            expect(art.shapes.length).toBeGreaterThanOrEqual(2);
            expect(art.shapes.length).toBeLessThanOrEqual(4);
            expect(Object.keys(COLORS)).toContain(art.background);
            for (const shape of art.shapes) {
              expect(SHAPES).toContain(shape.kind);
              expect(Object.keys(COLORS)).toContain(shape.color);
              expect(shape.x).toBeGreaterThanOrEqual(0);
              expect(shape.y).toBeGreaterThanOrEqual(0);
              if (shape.kind === 'line') {
                const angle = (shape.rotation * Math.PI) / 180;
                for (const direction of [-1, 1]) {
                  const x =
                    shape.x + shape.size / 2 + (direction * Math.sin(angle) * shape.size) / 2;
                  const y =
                    shape.y + shape.size / 2 + (direction * Math.cos(angle) * shape.size) / 2;
                  expect(x).toBeGreaterThan(0);
                  expect(x).toBeLessThan(art.width);
                  expect(y).toBeGreaterThan(0);
                  expect(y).toBeLessThan(art.height);
                }
              } else {
                expect(shape.x + shape.size).toBeLessThanOrEqual(art.width);
                expect(shape.y + shape.size).toBeLessThanOrEqual(art.height);
              }
            }
          }
        }
      }
    }
  });

  it('exports standalone editable SVG with safely escaped accessible text', () => {
    const art = generateIllustration('balance', 'blue', 'square', 2);
    const svg = illustrationSvg(art, '<script>"&\'');
    expect(svg).toContain('viewBox="0 0 400 400"');
    expect(svg).toContain('<title>&lt;script&gt;&quot;&amp;&apos;</title>');
    expect(svg).toContain(COLORS[art.background]);
    expect(svg).toContain('vector-effect="non-scaling-stroke"');
    expect(svg).not.toMatch(/<script|var\(|foreignObject/);
  });
});

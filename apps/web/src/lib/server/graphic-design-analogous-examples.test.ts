// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'analogous-workshop-family',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['session-0', 'session-1', 'session-2'],
    differences: 2,
  },
  {
    name: 'analogous-coffee-variation',
    photo: 'core-message-coffee-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['blend-0', 'blend-1', 'blend-2'],
    differences: 2,
  },
  {
    name: 'analogous-supper-legibility',
    photo: 'chunk-garden-supper-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['detail-0', 'detail-1', 'detail-2', 'detail-3'],
    differences: 4,
  },
];
const svg = (name: string) => {
  const doc = new DOMParser().parseFromString(
    readFileSync(resolve(assets, name + '.svg'), 'utf8'),
    'image/svg+xml',
  );
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
};
const group = (doc: Document, variant: string) => doc.querySelector(`[data-variant="${variant}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
const element = (g: Element, id: string) => g.querySelector(`[data-element="${id}"]`)!;
describe('Build Analogous Harmony controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared fill assignments',
    ({ name, ids, differences }) => {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(
        ids.filter(
          (id) =>
            element(before, id).getAttribute('fill') !== element(after, id).getAttribute('fill'),
        ),
      ).toHaveLength(differences);
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe('fill');
          e.removeAttribute('fill');
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVAnalogousSans');
          expect(e.getAttribute('font-weight')).toBe('400');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );

  it.each(examples)(
    '$name embeds exact source photographs, presentation and font bytes',
    ({ name, photo, stage }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', stage],
      ])
        expect(doc.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
        );
      expect(doc.querySelector('defs style')!.textContent).toContain(
        'src:url(data:font/woff2;base64,' +
          readFileSync(
            resolve(root, 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2'),
          ).toString('base64'),
      );
    },
  );

  it.each(examples)(
    '$name preserves complete artifacts and definitions in the narrow version',
    ({ name }) => {
      const wide = svg(name),
        mobile = svg(name + '-mobile');
      for (const variant of ['before', 'after'])
        expect(
          normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant))),
        ).toBe(true);
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    },
  );

  it('preserves swatch count and center anchors while changing the local hue arc or text value', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-analogous-layouts.json'),
        'utf8',
      ),
    );
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lum = (hex: string) =>
      channels(hex)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
    const hue = (hex: string) => {
      const [r, g, b] = channels(hex),
        hi = Math.max(r, g, b),
        lo = Math.min(r, g, b),
        d = hi - lo;
      const h = hi === r ? (g - b) / d : hi === g ? 2 + (b - r) / d : 4 + (r - g) / d;
      return (h * 60 + 360) % 360;
    };
    const arc = (colors: string[]) => {
      const hs = colors.map(hue).sort((a, b) => a - b),
        gaps = hs.map((h, i) => hs[(i + 1) % hs.length] + (i === hs.length - 1 ? 360 : 0) - h);
      return 360 - Math.max(...gaps);
    };
    const c = record.colors;
    expect(arc(c.programmeBefore)).toBeGreaterThan(150);
    expect(arc(c.programmeAfter)).toBeGreaterThan(37);
    expect(arc(c.programmeAfter)).toBeLessThan(43);
    expect(arc(c.coffeeBefore)).toBeLessThan(4);
    expect(arc(c.coffeeAfter)).toBeGreaterThan(37);
    expect(arc(c.coffeeAfter)).toBeLessThan(43);
    for (const [before, after] of [
      [c.programmeBefore, c.programmeAfter],
      [c.coffeeBefore, c.coffeeAfter],
    ]) {
      expect(new Set(before).size).toBe(3);
      expect(new Set(after).size).toBe(3);
      expect(before[1]).toBe(after[1]);
      for (let i = 0; i < 3; i++)
        expect(Math.abs(lum(before[i]) - lum(after[i]))).toBeLessThan(0.002);
    }
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant);
        expect(record.examples[i].declaredFills[v]).toEqual(
          spec.ids.map((id) => ({ element: id, fill: element(g, id).getAttribute('fill') })),
        );
      }
    for (const [name, id] of [
      [examples[0].name, 'session-1'],
      [examples[1].name, 'blend-1'],
    ]) {
      const d = svg(name);
      expect(element(group(d, 'before'), id).isEqualNode(element(group(d, 'after'), id))).toBe(
        true,
      );
    }
    const supper = svg(examples[2].name);
    for (const variant of ['before', 'after']) {
      const g = group(supper, variant);
      expect(element(g, 'details-panel').getAttribute('fill')).toBe(c.supperPanel);
      expect(element(g, 'detail-0').textContent).toBe('Friday 20 November · 19:00');
      expect(element(g, 'detail-2').textContent).toBe('£28 per person · Booking required');
      for (let i = 0; i < 4; i++)
        expect(element(g, 'detail-' + i).getAttribute('fill')).toBe(
          variant === 'before' ? c.supperBefore : c.supperAfter,
        );
    }
    const ratio = (fg: string, bg: string) => {
      const ys = [lum(fg), lum(bg)].sort((a, b) => b - a);
      return (ys[0] + 0.05) / (ys[1] + 0.05);
    };
    expect(ratio(c.supperBefore, c.supperPanel)).toBeCloseTo(record.textContrast.supperBefore, 8);
    expect(ratio(c.supperAfter, c.supperPanel)).toBeCloseTo(record.textContrast.supperAfter, 8);
    expect(record.textContrast.supperBefore).toBeLessThan(3);
    expect(record.textContrast.supperAfter).toBeGreaterThanOrEqual(4.5);
    expect(record.supperHsl.before.slice(0, 2)).toEqual(record.supperHsl.after.slice(0, 2));
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

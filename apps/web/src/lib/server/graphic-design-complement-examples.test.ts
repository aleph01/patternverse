// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'complement-entry-accent',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['entry-badge'],
    differences: 1,
  },
  {
    name: 'complement-studio-categories',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['bar-0-1', 'bar-1-1'],
    differences: 2,
  },
  {
    name: 'complement-product-legibility',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['product-panel'],
    differences: 1,
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
describe('Use Complementary Contrast controlled photographic comparisons', () => {
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
          expect(e.getAttribute('font-family')).toBe('PVComplementSans');
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

  it('demonstrates complementary hues separately from relative luminance and text contrast', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-complement-layouts.json'),
        'utf8',
      ),
    );
    const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lum = (hex: string) =>
      channels(hex)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a: string, b: string) => {
      const x = [lum(a), lum(b)].sort((a, b) => b - a);
      return (x[0] + 0.05) / (x[1] + 0.05);
    };
    const hue = (hex: string) => {
      const [r, g, b] = channels(hex),
        hi = Math.max(r, g, b),
        lo = Math.min(r, g, b),
        d = hi - lo;
      let h = hi === r ? (g - b) / d : hi === g ? 2 + (b - r) / d : 4 + (r - g) / d;
      h = (h * 60 + 360) % 360;
      return h;
    };
    const opposite = (a: string, b: string) => {
      const d = Math.abs(hue(a) - hue(b));
      expect(Math.min(d, 360 - d)).toBeGreaterThan(178);
    };
    const c = record.colors;
    opposite(c.blue, c.badgeOrange);
    opposite(c.blue, c.categoryOrange);
    opposite(c.blue, c.productOrange);
    opposite(c.ink, c.productOrange);
    expect(Math.abs(lum(c.badgeBlue) - lum(c.badgeOrange))).toBeLessThan(0.002);
    expect(Math.abs(lum(c.blue) - lum(c.categoryBefore))).toBeLessThan(0.002);
    expect(Math.abs(lum(c.blue) - lum(c.categoryOrange))).toBeLessThan(0.002);
    expect(ratio(c.productOrange, c.blue)).toBeCloseTo(record.textContrast.productBefore, 8);
    expect(ratio(c.productOrange, c.ink)).toBeCloseTo(record.textContrast.productAfter, 8);
    expect(record.textContrast.productBefore).toBeLessThan(3);
    expect(record.textContrast.productAfter).toBeGreaterThanOrEqual(4.5);
    expect(record.textContrast.badgeBefore).toBeGreaterThanOrEqual(4.5);
    expect(record.textContrast.badgeAfter).toBeGreaterThanOrEqual(4.5);
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant);
        expect(record.examples[i].declaredFills[v]).toEqual(
          spec.ids.map((id) => ({ element: id, fill: element(g, id).getAttribute('fill') })),
        );
      }
    const report = svg(examples[1].name);
    for (const variant of ['before', 'after'])
      for (const [p, values] of [
        [42, 28],
        [48, 36],
      ].entries())
        for (const [i, value] of values.entries()) {
          const g = group(report, variant),
            bar = element(g, `bar-${p}-${i}`);
          expect(Number(bar.getAttribute('width'))).toBe(value * 6);
          expect(bar.getAttribute('x')).toBe('200');
          expect(element(g, `site-${p}-${i}`).textContent).toBe(['Riverside', 'Hill'][i]);
          expect(element(g, `value-${p}-${i}`).textContent).toBe(String(value));
        }
    const product = svg(examples[2].name);
    for (const id of ['product-name', 'specification', 'price-date']) {
      expect(
        element(group(product, 'before'), id).isEqualNode(element(group(product, 'after'), id)),
      ).toBe(true);
      expect(element(group(product, 'after'), id).getAttribute('fill')).toBe(c.productOrange);
    }
    expect(element(group(product, 'before'), 'product-panel').getAttribute('fill')).toBe(c.blue);
    expect(element(group(product, 'after'), 'product-panel').getAttribute('fill')).toBe(c.ink);
    expect(record.hslInputs.blue.slice(0, 2)).toEqual(record.hslInputs.ink.slice(0, 2));
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

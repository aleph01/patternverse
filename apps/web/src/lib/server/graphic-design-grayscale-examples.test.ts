// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'grayscale-workshop-details',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['detail-0', 'detail-1', 'detail-2', 'detail-3'],
    differences: 4,
    attribute: 'fill',
  },
  {
    name: 'grayscale-studio-categories',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['studio-0-0', 'studio-1-0', 'studio-0-1', 'studio-1-1', 'studio-0-2', 'studio-1-2'],
    differences: 6,
    attribute: 'opacity',
  },
  {
    name: 'grayscale-booking-link',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    ids: ['link-underline'],
    differences: 1,
    attribute: 'opacity',
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
const group = (doc: Document, variant: string, view = 'color') =>
  doc.querySelector(`[data-variant="${variant}"][data-view="${view}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  clone.removeAttribute('data-view');
  return clone;
};
const element = (g: Element, id: string) => g.querySelector(`[data-element="${id}"]`)!;
describe('Test in Grayscale controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared color attributes',
    ({ name, ids, differences, attribute }) => {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(
        ids.filter(
          (id) =>
            element(before, id).getAttribute(attribute) !==
            element(after, id).getAttribute(attribute),
        ),
      ).toHaveLength(differences);
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe(attribute);
          e.removeAttribute(attribute);
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVGrayscaleSans');
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

  it('uses identical artifact children and one identical filter for all diagnostic previews', () => {
    for (const spec of examples) {
      const d = svg(spec.name),
        mobile = svg(spec.name + '-mobile');
      expect(d.querySelectorAll('[data-variant]')).toHaveLength(4);
      for (const variant of ['before', 'after']) {
        const color = normalized(group(d, variant)),
          gray = normalized(group(d, variant, 'grayscale'));
        expect(color.hasAttribute('filter')).toBe(false);
        expect(gray.getAttribute('filter')).toBe('url(#grayscale-check)');
        gray.removeAttribute('filter');
        expect(color.isEqualNode(gray)).toBe(true);
        expect(
          normalized(group(d, variant, 'grayscale')).isEqualNode(
            normalized(group(mobile, variant, 'grayscale')),
          ),
        ).toBe(true);
      }
      expect(d.querySelector('filter')?.getAttribute('color-interpolation-filters')).toBe(
        'linearRGB',
      );
      expect(d.querySelector('feColorMatrix')?.getAttribute('type')).toBe('matrix');
      expect(
        d.querySelector('feColorMatrix')?.getAttribute('values')?.split(' ').map(Number),
      ).toEqual([
        0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0.2126, 0.7152, 0.0722, 0, 0, 0,
        0, 0, 1, 0,
      ]);
    }
  });

  it('checks contrast, near-equal-luminance colors, direct identifiers and unchanged chart data', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-grayscale-layouts.json'),
        'utf8',
      ),
    );
    const lum = (hex: string) =>
      [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (a: string, b: string) => {
      const ys = [lum(a), lum(b)].sort((x, y) => y - x);
      return (ys[0] + 0.05) / (ys[1] + 0.05);
    };
    const c = record.colors;
    for (const [key, a, b] of [
      ['detailsBefore', c.detailBefore, c.paper],
      ['detailsAfter', c.detailAfter, c.paper],
      ['linkBody', c.link, c.ink],
      ['linkSurface', c.link, c.paper],
    ])
      expect(ratio(a, b)).toBeCloseTo(record.contrastRatios[key], 8);
    expect(record.contrastRatios.detailsBefore).toBeLessThan(3);
    expect(record.contrastRatios.detailsAfter).toBeGreaterThanOrEqual(4.5);
    expect(record.contrastRatios.linkSurface).toBeGreaterThanOrEqual(4.5);
    expect(Math.abs(lum(c.studioA) - lum(c.studioB))).toBeLessThan(0.001);
    expect(Math.abs(lum(c.link) - lum(c.ink))).toBeLessThan(0.001);
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant);
        expect(record.examples[i].declaredChanges[v]).toEqual(
          spec.ids.map((id) => ({
            element: id,
            attribute: spec.attribute,
            value: element(g, id).getAttribute(spec.attribute),
          })),
        );
      }
    const d = svg(examples[1].name);
    for (const variant of ['before', 'after'])
      for (const view of ['color', 'grayscale']) {
        const g = group(d, variant, view);
        for (const [j, studio] of ['A', 'B'].entries())
          for (const [i, value] of record.studioBookings[studio].entries()) {
            const bar = element(g, `bar-${j}-${i}`),
              label = element(g, `studio-${j}-${i}`);
            expect(Number(bar.getAttribute('height'))).toBeCloseTo(value * 2.7, 8);
            expect(Number(bar.getAttribute('y')) + Number(bar.getAttribute('height'))).toBeCloseTo(
              710,
              8,
            );
            expect(bar.getAttribute('fill')).toBe(j ? c.studioB : c.studioA);
            expect(label.textContent).toBe(studio);
            expect(label.getAttribute('opacity')).toBe(variant === 'before' ? '0' : '1');
            expect(element(g, `value-${j}-${i}`).textContent).toBe(String(value));
          }
      }
    const b = svg(examples[2].name);
    for (const variant of ['before', 'after']) {
      const g = group(b, variant);
      expect(element(g, 'change-date').textContent).toBe('Change date');
      expect(element(g, 'link-underline').getAttribute('d')).toBe('M270 443H369');
      expect(element(g, 'total').textContent).toBe('Total today: £18');
    }
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

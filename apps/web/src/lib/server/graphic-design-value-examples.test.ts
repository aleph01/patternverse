// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'value-cinema-details',
    photo: 'remove-courtyard-cinema-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['detail-0', 'detail-1', 'detail-2', 'detail-3'],
    differences: 4,
    attribute: 'fill',
  },
  {
    name: 'value-guest-checkbox',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    ids: ['guest-checkbox'],
    differences: 1,
    attribute: 'stroke',
  },
  {
    name: 'value-report-masthead',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['masthead', 'masthead-label'],
    differences: 2,
    attribute: 'fill',
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
describe('Establish Value Contrast controlled photographic comparisons', () => {
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
          expect(e.getAttribute('font-family')).toBe('PVValueSans');
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

  it('verifies declared colors, independent contrast calculations and unchanged meaning', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-value-layouts.json'),
        'utf8',
      ),
    );
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
    const lum = (hex: string) =>
      [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ratio = (fg: string, bg: string) => {
      const ys = [lum(fg), lum(bg)].sort((a, b) => b - a);
      return (ys[0] + 0.05) / (ys[1] + 0.05);
    };
    const c = record.colors;
    for (const key of [
      'cinemaBefore',
      'cinemaAfter',
      'controlBefore',
      'controlAfter',
      'mastheadBefore',
      'mastheadAfter',
    ]) {
      const bg = key.startsWith('cinema')
        ? c.cinemaPanel
        : key.startsWith('control')
          ? c.paper
          : c[key];
      const fg = key.startsWith('masthead') ? c[key.replace('masthead', 'mastheadText')] : c[key];
      expect(ratio(fg, bg)).toBeCloseTo(record.contrastRatios[key], 8);
    }
    expect(record.contrastRatios.cinemaBefore).toBeLessThan(3);
    expect(record.contrastRatios.cinemaAfter).toBeGreaterThanOrEqual(4.5);
    expect(record.contrastRatios.controlBefore).toBeLessThan(3);
    expect(record.contrastRatios.controlAfter).toBeGreaterThanOrEqual(3);
    for (const key of ['mastheadBefore', 'mastheadAfter'])
      expect(record.contrastRatios[key]).toBeGreaterThanOrEqual(4.5);
    for (const key of ['cinema', 'control', 'masthead', 'mastheadText'])
      expect(record.hslInputs[key + 'Before'].slice(0, 2)).toEqual(
        record.hslInputs[key + 'After'].slice(0, 2),
      );
    for (const variant of ['before', 'after']) {
      const checkbox = element(group(svg(examples[1].name), variant), 'guest-checkbox');
      expect(
        ['x', 'y', 'width', 'height', 'stroke-width', 'fill'].map((a) => checkbox.getAttribute(a)),
      ).toEqual(['158', '528', '24', '24', '2', c.paper]);
      const report = group(svg(examples[2].name), variant);
      expect(report.textContent).toContain('238');
      expect(report.textContent).toContain('Feb 42 · Mar 56 · Apr 64 · May 76');
      expect(report.textContent).toContain('Total bookings, not unique visitors.');
    }
    expect(record.monthlyBookings.reduce((a: number, b: number) => a + b, 0)).toBe(record.total);
    expect(record.total).toBe(238);
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

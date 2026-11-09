// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'background-studio-invitation',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['text-backing'],
    differences: 1,
    attribute: 'opacity',
  },
  {
    name: 'background-pitcher-texture',
    photo: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['backdrop-pattern'],
    differences: 1,
    attribute: 'opacity',
  },
  {
    name: 'background-booking-surface',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    ids: ['booking-surface'],
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
const group = (doc: Document, variant: string) => doc.querySelector(`[data-variant="${variant}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
const element = (g: Element, id: string) => g.querySelector(`[data-element="${id}"]`)!;
describe('Control the Background controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared background opacity',
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
          expect(e.getAttribute('font-family')).toBe('PVBackgroundSans');
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
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
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

  it('verifies opacity values, layer order, preserved surfaces and opaque text contrast', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-background-layouts.json'),
        'utf8',
      ),
    );
    const values = [
      ['0', '1'],
      ['0.65', '0.1'],
      ['0.66', '1'],
    ];
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant),
          e = element(g, spec.ids[0]);
        expect(e.getAttribute('opacity')).toBe(values[i][v]);
        expect(record.examples[i].declaredChanges[v]).toEqual([
          { element: spec.ids[0], attribute: 'opacity', value: values[i][v] },
        ]);
        expect(record.examples[i].source).toBe(spec.photo);
        if (i !== 1) {
          expect(e.getAttribute('fill')).toBe(record.colors.opaqueSurface);
          expect(element(g, i === 0 ? 'headline' : 'card-title').getAttribute('fill')).toBe(
            record.colors.foreground,
          );
        }
        if (i === 0) {
          expect(e.previousElementSibling?.getAttribute('data-element')).toBe('image-window');
          expect(e.nextElementSibling?.getAttribute('data-element')).toBe('headline');
        }
        if (i === 1) {
          expect(e.getAttribute('fill')).toBe('url(#waves)');
          expect(e.previousElementSibling?.getAttribute('fill')).toBe(record.colors.productGround);
          expect(e.nextElementSibling?.getAttribute('data-element')).toBe('image-window');
          const window = element(g, 'image-window');
          expect(window.getAttribute('viewBox')).toBe('0 0 1312 1199');
          expect(window.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
        }
        if (i === 2) {
          expect(e.previousElementSibling?.getAttribute('data-element')).toBe('image-window');
          expect(e.nextElementSibling?.getAttribute('data-element')).toBe('card-title');
          expect(g.textContent).toContain('Monday 16 Nov');
          expect(g.textContent).toContain('€18 per person');
        }
      }
    const lum = (hex: string) =>
      [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
        .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
    const ys = [lum(record.colors.foreground), lum(record.colors.opaqueSurface)].sort(
      (a, b) => b - a,
    );
    expect((ys[0] + 0.05) / (ys[1] + 0.05)).toBeGreaterThan(4.5);
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'integration-newsletter-captions',
    photo: 'meaning-handbuilding-photo.jpg',
    photo2: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['workshop-caption', 'shop-caption'],
    differences: 2,
    attribute: 'transform',
  },
  {
    name: 'integration-pitcher-labels',
    photo: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['feature-leaders'],
    differences: 1,
    attribute: 'opacity',
  },
  {
    name: 'integration-maker-poster',
    photo: 'guide-maker-portrait.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['title-panel'],
    differences: 1,
    attribute: 'transform',
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
describe('Integrate Text and Image controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared text–image relationship attributes',
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
          expect(e.getAttribute('font-family')).toBe('PVIntegrationSans');
          expect(e.getAttribute('font-weight')).toBe('400');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );

  it.each(examples)(
    '$name embeds exact source photographs, presentation and font bytes',
    ({ name, photo, photo2, stage }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', stage],
        ...(photo2 ? [['photo2', photo2]] : []),
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

  it('verifies exact caption movement, leader endpoints and protected portrait region', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-integration-layouts.json'),
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
    const newsletter = svg(examples[0].name);
    for (const [variant, y] of [
      ['before', 660],
      ['after', 360],
    ] as const) {
      const g = group(newsletter, variant);
      expect(element(g, 'workshop-caption').getAttribute('transform')).toBe(`translate(65 ${y})`);
      expect(element(g, 'shop-caption').getAttribute('transform')).toBe(`translate(320 ${y})`);
      expect(element(g, 'workshop-photo').getAttribute('y')).toBe('200');
      expect(element(g, 'workshop-photo').getAttribute('height')).toBe('150');
      expect(g.textContent).toContain('Wed 18 Nov · £28');
      expect(g.textContent).toContain('£24 · Warm white');
    }
    const product = svg(examples[1].name);
    for (const [variant, opacity] of [
      ['before', '0'],
      ['after', '1'],
    ]) {
      const g = group(product, variant),
        leaders = element(g, 'feature-leaders');
      expect(leaders.getAttribute('opacity')).toBe(opacity);
      expect(element(g, 'lip-leader').getAttribute('d')).toBe('M115 274V359L172 374');
      expect(element(g, 'handle-leader').getAttribute('d')).toBe('M410 274H490V477H443');
      expect(element(g, 'product-photo').getAttribute('viewBox')).toBe('0 0 1312 1199');
      expect(element(g, 'product-photo').getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
      expect(g.textContent).toContain('Pouring lip');
      expect(g.textContent).toContain('Loop handle');
    }
    const portrait = svg(examples[2].name);
    for (const [variant, y] of [
      ['before', 320],
      ['after', 590],
    ] as const) {
      const g = group(portrait, variant);
      expect(element(g, 'title-panel').getAttribute('transform')).toBe(`translate(85 ${y})`);
      expect(element(g, 'panel-surface').getAttribute('width')).toBe('440');
      expect(element(g, 'panel-surface').getAttribute('height')).toBe('155');
      expect(element(g, 'portrait-photo').getAttribute('viewBox')).toBe('0 0 1024 1536');
      expect(g.textContent).toContain('Thu 19 Nov · 19:00 · Free entry');
    }
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

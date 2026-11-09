// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Example = { name: string; sources: Record<string, string>; changes: Record<string, string[]> };
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples: Example[] = [
  {
    name: 'similarity-studio-program',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'badge-1': ['fill', 'rx'], 'badge-2': ['fill', 'rx'] },
  },
  {
    name: 'similarity-product-prices',
    sources: {
      photo: 'explicit-tableware-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: { 'price-2': ['font-family', 'font-style'] },
  },
  {
    name: 'similarity-booking-controls',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'audience-phone-stage.jpg' },
    changes: { 'status-surface': ['opacity'], status: ['fill'] },
  },
];
const svg = (name: string) => {
  const document = new DOMParser().parseFromString(
    readFileSync(resolve(assets, name + '.svg'), 'utf8'),
    'image/svg+xml',
  );
  expect(document.querySelector('parsererror')).toBeNull();
  return document;
};
const group = (document: Document, variant: string) =>
  document.querySelector(`[data-variant="${variant}"]`)!;
const part = (element: Element, id: string) => element.querySelector(`[data-element="${id}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
describe('Signal Relationships Through Similarity controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared style features', ({ name, changes }) => {
    const document = svg(name),
      before = normalized(group(document, 'before')),
      after = normalized(group(document, 'after'));
    expect(before.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
    expect(after.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
    for (const [id, attributes] of Object.entries(changes)) {
      const a = part(before, id),
        b = part(after, id);
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a.getAttribute('data-change')?.split(' ')).toEqual(attributes);
      for (const attribute of attributes) {
        expect(['fill', 'rx', 'font-family', 'font-style', 'opacity']).toContain(attribute);
        expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
        a.removeAttribute(attribute);
        b.removeAttribute(attribute);
      }
    }
    expect(before.isEqualNode(after)).toBe(true);
  });
  it.each(examples)(
    '$name embeds the identical local image and paper sources',
    ({ name, sources }) => {
      const document = svg(name);
      for (const [id, file] of Object.entries(sources))
        expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
        );
    },
  );
  it.each(examples)('$name preserves the complete variants in its stacked view', ({ name }) => {
    const wide = svg(name),
      mobile = svg(name + '-mobile');
    for (const variant of ['before', 'after'])
      expect(normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant)))).toBe(
        true,
      );
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
  });
  it('maps badge treatments to categories, shares the price role and reserves button styling for actions', () => {
    const program = svg('similarity-studio-program');
    const feature = (el: Element) => [el.getAttribute('fill'), el.getAttribute('rx')];
    for (const variant of ['before', 'after']) {
      const g = group(program, variant),
        badges = [0, 1, 2, 3].map((i) => feature(part(g, 'badge-' + i)));
      expect(part(g, 'category-0').textContent).toBe(part(g, 'category-2').textContent);
      expect(part(g, 'category-1').textContent).toBe(part(g, 'category-3').textContent);
      if (variant === 'before') {
        expect(badges[0]).toEqual(badges[1]);
        expect(badges[2]).toEqual(badges[3]);
        expect(badges[0]).not.toEqual(badges[2]);
      } else {
        expect(badges[0]).toEqual(badges[2]);
        expect(badges[1]).toEqual(badges[3]);
        expect(badges[0]).not.toEqual(badges[1]);
      }
    }
    const products = svg('similarity-product-prices');
    const role = (el: Element) => [
      el.getAttribute('font-family'),
      el.getAttribute('font-style') ?? 'normal',
      el.getAttribute('font-size'),
      el.getAttribute('font-weight'),
      el.getAttribute('fill'),
    ];
    expect(role(part(group(products, 'before'), 'price-1'))).not.toEqual(
      role(part(group(products, 'before'), 'price-2')),
    );
    expect(role(part(group(products, 'after'), 'price-1'))).toEqual(
      role(part(group(products, 'after'), 'price-2')),
    );
    const booking = svg('similarity-booking-controls'),
      before = group(booking, 'before'),
      after = group(booking, 'after');
    for (const id of ['book-surface', 'access-surface']) {
      const surface = part(after, id);
      expect(surface.isEqualNode(part(before, id))).toBe(true);
      for (const key of ['width', 'height', 'rx', 'fill'])
        expect(part(before, 'status-surface').getAttribute(key)).toBe(surface.getAttribute(key));
    }
    expect(part(before, 'status-surface').getAttribute('opacity')).toBe('1');
    expect(part(after, 'status-surface').getAttribute('opacity')).toBe('0');
    expect(part(after, 'status').getAttribute('fill')).toBe(
      part(after, 'date').getAttribute('fill'),
    );
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

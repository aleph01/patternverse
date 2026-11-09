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
    name: 'proximity-material-captions',
    sources: {
      photo: 'audience-pottery-photo.jpg',
      photo2: 'explicit-tableware-photo.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: { 'caption-1': ['y'] },
  },
  {
    name: 'proximity-studio-schedule',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'detail-0': ['y'], 'detail-1': ['y'], 'detail-2': ['y'] },
  },
  {
    name: 'proximity-product-prices',
    sources: {
      photo: 'explicit-tableware-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: { 'price-0': ['transform'], 'price-1': ['transform'] },
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
describe('Group Related Elements Through Proximity controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared positions', ({ name, changes }) => {
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
        expect(['y', 'transform']).toContain(attribute);
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
  it('attaches the caption, pairs session details, and moves prices into local product groups', () => {
    const captions = svg('proximity-material-captions');
    const y = (el: Element) => Number(el.getAttribute('y'));
    for (const variant of ['before', 'after']) {
      const g = group(captions, variant),
        first = part(g, 'photograph-1'),
        second = part(g, 'photograph-2'),
        caption = part(g, 'caption-1'),
        gapBelowFirst = y(caption) - y(first) - Number(first.getAttribute('height')),
        gapAboveSecond = y(second) - y(caption);
      if (variant === 'before') expect(gapBelowFirst).toBeGreaterThan(gapAboveSecond);
      else expect(gapBelowFirst).toBeLessThan(gapAboveSecond);
    }
    const schedule = svg('proximity-studio-schedule');
    for (let i = 0; i < 3; i++) {
      const before = group(schedule, 'before'),
        after = group(schedule, 'after');
      expect(y(part(after, 'detail-' + i))).toBe(y(part(before, 'detail-' + i)) - 40);
      if (i < 2) {
        const a = y(part(before, 'session-' + i)),
          b = y(part(before, 'detail-' + i)),
          c = y(part(before, 'session-' + (i + 1)));
        expect(b - a).toBe(c - b);
        expect(y(part(after, 'detail-' + i)) - a).toBeLessThan(c - y(part(after, 'detail-' + i)));
      }
    }
    const products = svg('proximity-product-prices');
    const position = (g: Element, i: number) =>
      part(g, 'price-' + i)
        .getAttribute('transform')!
        .match(/translate\(([\d.]+) ([\d.]+)\)/)!
        .slice(1)
        .map(Number);
    const before = group(products, 'before'),
      after = group(products, 'after');
    expect(position(before, 0)[0]).toBe(position(before, 1)[0]);
    expect(position(after, 0)[1]).toBe(position(after, 1)[1]);
    const distance = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
    for (let i = 0; i < 2; i++) {
      const own = part(after, 'spec-' + (i + 1)),
        anchor = [Number(own.getAttribute('x')), y(own)];
      expect(position(after, i)[0]).toBe(anchor[0]);
      expect(distance(position(after, i), anchor)).toBeLessThan(
        distance(position(before, i), anchor),
      );
      expect(distance(position(after, i), anchor)).toBeLessThan(
        distance(position(after, i), position(after, 1 - i)),
      );
    }
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

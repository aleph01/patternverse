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
    name: 'frame-workshop-offer',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'offer-frame': ['height'] },
  },
  {
    name: 'frame-open-studio',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'text-field': ['opacity'] },
  },
  {
    name: 'frame-product-details',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: {
      'inner-frame-0': ['stroke-opacity'],
      'inner-frame-1': ['stroke-opacity'],
      'inner-frame-2': ['stroke-opacity'],
      'inner-frame-3': ['stroke-opacity'],
    },
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
describe('Frame the Content controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared frame dimensions or visibility',
    ({ name, changes }) => {
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
          expect(['height', 'opacity', 'stroke-opacity']).toContain(attribute);
          expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
          a.removeAttribute(attribute);
          b.removeAttribute(attribute);
        }
      }
      expect(before.isEqualNode(after)).toBe(true);
    },
  );
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
  it('includes the intended offer details, supplies a solid text background and keeps one product enclosure', () => {
    const offer = svg('frame-workshop-offer');
    const bottom = (v: string) => {
      const el = part(group(offer, v), 'offer-frame');
      return Number(el.getAttribute('y')) + Number(el.getAttribute('height'));
    };
    expect(bottom('before')).toBe(640);
    expect(bottom('after')).toBe(740);
    for (const id of ['offer-inclusion', 'offer-collection']) {
      const y = Number(part(group(offer, 'after'), id).getAttribute('y'));
      expect(y).toBeGreaterThan(bottom('before'));
      expect(y).toBeLessThan(bottom('after'));
    }
    const poster = svg('frame-open-studio');
    expect(part(group(poster, 'before'), 'text-field').getAttribute('opacity')).toBe('0');
    const after = group(poster, 'after'),
      surface = part(after, 'text-field');
    expect(surface.getAttribute('opacity')).toBe('1');
    const luminance = (color: string) => {
      const c = [1, 3, 5]
        .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const bg = luminance(surface.getAttribute('fill')!);
    for (const id of ['headline', 'description', 'date', 'entry']) {
      const fg = luminance(part(after, id).getAttribute('fill')!);
      expect((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)).toBeGreaterThan(4.5);
    }
    const product = svg('frame-product-details');
    expect(
      part(group(product, 'before'), 'outer-frame').isEqualNode(
        part(group(product, 'after'), 'outer-frame'),
      ),
    ).toBe(true);
    for (let i = 0; i < 4; i++)
      expect(part(group(product, 'after'), 'inner-frame-' + i).getAttribute('stroke-opacity')).toBe(
        '0',
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

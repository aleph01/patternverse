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
    name: 'boundaries-session-records',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'session-regions': ['opacity'] },
  },
  {
    name: 'boundaries-shared-delivery',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'left-region': ['height'] },
  },
  {
    name: 'boundaries-offer-membership',
    sources: { photo: 'audience-workspace-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'offer-regions': ['d'] },
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
describe('Group Elements Within Shared Boundaries controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared declared membership boundaries',
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
          expect(['d', 'opacity', 'height']).toContain(attribute);
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
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
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
  it('encloses complete sessions, excludes shared terms from both offers, and changes the grouping axis without changing content', () => {
    const records = svg('boundaries-session-records'),
      rg = group(records, 'after');
    expect(part(group(records, 'before'), 'session-regions').getAttribute('opacity')).toBe('0');
    expect(part(rg, 'session-regions').getAttribute('opacity')).toBe('1');
    for (const prefix of ['morning', 'afternoon']) {
      const region = part(rg, prefix + '-region'),
        top = Number(region.getAttribute('y')),
        bottom = top + Number(region.getAttribute('height'));
      for (const suffix of ['title', 'place', 'time', 'price', 'inclusion']) {
        const y = Number(part(rg, prefix + '-' + suffix).getAttribute('y'));
        expect(y).toBeGreaterThan(top);
        expect(y).toBeLessThan(bottom);
      }
    }
    const delivery = svg('boundaries-shared-delivery'),
      before = group(delivery, 'before'),
      after = group(delivery, 'after');
    const bottom = (el: Element) =>
      Number(el.getAttribute('y')) + Number(el.getAttribute('height'));
    for (const id of ['shared-scope', 'delivery-charge', 'dispatch']) {
      const y = Number(part(after, id).getAttribute('y'));
      expect(y).toBeLessThan(bottom(part(before, 'left-region')));
      expect(y).toBeGreaterThan(bottom(part(after, 'left-region')));
      expect(y).toBeGreaterThan(bottom(part(after, 'right-region')));
    }
    const offers = svg('boundaries-offer-membership');
    expect(
      part(group(offers, 'before'), 'offer-regions').getAttribute('d')?.match(/M/g),
    ).toHaveLength(5);
    expect(part(group(offers, 'after'), 'offer-regions').getAttribute('d')).toBe(
      'M65 455H295V750H65ZM315 455H545V750H315Z',
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

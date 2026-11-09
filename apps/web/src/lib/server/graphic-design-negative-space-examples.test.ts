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
    name: 'space-evening-invitation',
    sources: { photo: 'scale-greenhouse-photo-v2.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { photograph: ['y'] },
  },
  {
    name: 'space-workshop-details',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { bring: ['y'], access: ['y'], book: ['y'] },
  },
  {
    name: 'space-product-card',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'panel-copy': ['transform'] },
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
describe('Use Negative Space controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared positions only', ({ name, changes }) => {
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
  it('reallocates space without changing content, internal line spacing or image dimensions', () => {
    const invitation = svg('space-evening-invitation');
    expect(
      Number(part(group(invitation, 'after'), 'photograph').getAttribute('y')) -
        Number(part(group(invitation, 'before'), 'photograph').getAttribute('y')),
    ).toBe(80);
    const workshop = svg('space-workshop-details');
    for (const id of ['bring', 'access', 'book'])
      expect(
        Number(part(group(workshop, 'after'), id).getAttribute('y')) -
          Number(part(group(workshop, 'before'), id).getAttribute('y')),
      ).toBe(15);
    const product = svg('space-product-card');
    expect(part(group(product, 'after'), 'panel-copy').getAttribute('transform')).toBe(
      'translate(22 22)',
    );
    for (const doc of [invitation, workshop, product])
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

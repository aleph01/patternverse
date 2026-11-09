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
    name: 'balance-evening-invitation',
    sources: { photo: 'scale-greenhouse-photo-v2.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { photograph: ['x'] },
  },
  {
    name: 'balance-peer-workshops',
    sources: {
      photo: 'audience-pottery-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: { 'panel-surface': ['fill'], 'panel-copy': ['fill'] },
  },
  {
    name: 'balance-material-study',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'study-identifier': ['font-weight'] },
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
const luminance = (color: string) => {
  const rgb = [1, 3, 5]
    .map((i) => parseInt(color.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
};
describe('Balance Visual Weight controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared position, tone or type weight',
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
          expect(['x', 'fill', 'font-weight']).toContain(attribute);
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
  it('redistributes the photo, lightens the peer panel legibly and strengthens the identifier without enlarging it', () => {
    const invitation = svg('balance-evening-invitation');
    const centers = ['before', 'after'].map((v) => {
      const image = part(group(invitation, v), 'photograph');
      return Number(image.getAttribute('x')) + Number(image.getAttribute('width')) / 2;
    });
    expect(centers[0]).toBeLessThan(305);
    expect(centers[1]).toBeGreaterThan(305);
    const workshops = svg('balance-peer-workshops');
    const before = group(workshops, 'before'),
      after = group(workshops, 'after');
    expect(luminance(part(after, 'panel-surface').getAttribute('fill')!)).toBeGreaterThan(
      luminance(part(before, 'panel-surface').getAttribute('fill')!),
    );
    expect(part(before, 'print-panel').isEqualNode(part(after, 'print-panel'))).toBe(true);
    for (const variant of [before, after]) {
      const bg = luminance(part(variant, 'panel-surface').getAttribute('fill')!),
        fg = luminance(part(variant, 'panel-copy').getAttribute('fill')!);
      expect((Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05)).toBeGreaterThan(4.5);
    }
    const study = svg('balance-material-study');
    expect(part(group(study, 'before'), 'study-identifier').getAttribute('font-weight')).toBe(
      '400',
    );
    expect(part(group(study, 'after'), 'study-identifier').getAttribute('font-weight')).toBe('700');
    for (const text of part(group(study, 'after'), 'study-identifier').querySelectorAll('text'))
      expect(text.getAttribute('font-size')).toBe('32');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

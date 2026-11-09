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
    name: 'proportion-workshop-guide',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: {
      'instruction-panel': ['width'],
      'instruction-copy': ['line-wrap'],
      'facts-panel': ['transform'],
      'facts-surface': ['width'],
    },
  },
  {
    name: 'proportion-night-garden',
    sources: { photo: 'scale-greenhouse-photo-v2.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { headline: ['font-size'], subhead: ['font-size'] },
  },
  {
    name: 'proportion-material-study',
    sources: { photo: 'explicit-tableware-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: {
      'caption-1': ['y'],
      'caption-2': ['y'],
      'body-1': ['y'],
      'body-2': ['y'],
      'body-3': ['y'],
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
describe('Use Proportional Relationships controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared dimensions, reflow, sizes or leading',
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
          if (attribute === 'line-wrap') {
            const lines = (e: Element) => Array.from(e.querySelectorAll('text'));
            expect(
              lines(a)
                .map((e) => e.textContent)
                .join(' '),
            ).toBe(
              lines(b)
                .map((e) => e.textContent)
                .join(' '),
            );
            for (const el of [a, b])
              for (const [i, line] of lines(el).entries()) {
                expect(line.getAttributeNames().sort()).toEqual(['x', 'y']);
                expect(line.getAttribute('x')).toBe('0');
                expect(Number(line.getAttribute('y'))).toBe(i * 24);
              }
            expect(a.getAttribute('font-size')).toBe('18');
            expect(b.getAttribute('font-size')).toBe('18');
            a.replaceChildren();
            b.replaceChildren();
            continue;
          }
          expect(['y', 'transform', 'width', 'font-size']).toContain(attribute);
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
  it('uses the declared panel, type-size and leading relationships without dropping words', () => {
    const guide = svg('proportion-workshop-guide'),
      g = group(guide, 'after');
    expect(
      Number(part(g, 'instruction-panel').getAttribute('width')) /
        Number(part(g, 'facts-surface').getAttribute('width')),
    ).toBe(2);
    expect(
      Number(part(g, 'instruction-panel').getAttribute('width')) +
        Number(part(g, 'facts-surface').getAttribute('width')) +
        24,
    ).toBe(480);
    const poster = group(svg('proportion-night-garden'), 'after');
    const sizes = ['date', 'subhead', 'headline'].map((id) =>
      Number(part(poster, id).getAttribute('font-size')),
    );
    expect(sizes).toEqual([20, 30, 45]);
    expect(sizes[1] / sizes[0]).toBe(1.5);
    expect(sizes[2] / sizes[1]).toBe(1.5);
    const study = group(svg('proportion-material-study'), 'after');
    for (const [prefix, size, count] of [
      ['caption', 16, 3],
      ['body', 20, 4],
    ] as const) {
      const baselines = Array.from({ length: count }, (_, i) =>
        Number(part(study, prefix + '-' + i).getAttribute('y')),
      );
      for (let i = 1; i < count; i++) expect((baselines[i] - baselines[i - 1]) / size).toBe(1.5);
    }
    for (const { name } of examples) {
      const doc = svg(name);
      const words = (v: string) =>
        Array.from(group(doc, v).querySelectorAll('text'))
          .map((e) => e.textContent)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      expect(words('before')).toBe(words('after'));
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'leading-journal',
    photo: 'audience-workspace-photo.jpg',
    before: 23,
    after: 33,
    size: 22,
    count: 6,
  },
  {
    name: 'leading-care-card',
    photo: 'explicit-tableware-photo.jpg',
    before: 48,
    after: 33,
    size: 22,
    count: 4,
  },
  {
    name: 'leading-workshop-poster',
    photo: 'form-open-studios-photo.jpg',
    before: 91,
    after: 58,
    size: 52,
    count: 2,
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
const group = (doc: Document, variant: string) => doc.querySelector(`[data-variant="${variant}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
describe('Adjust Line Spacing controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the baseline interval and consequent line positions',
    ({ name, before, after, size, count }) => {
      const doc = svg(name);
      const variants = [normalized(group(doc, 'before')), normalized(group(doc, 'after'))];
      for (const [index, g] of variants.entries()) {
        expect(g.querySelectorAll('[data-change]')).toHaveLength(1);
        const body = g.querySelector('[data-element="adjusted-text"]')!;
        const leading = index === 0 ? before : after;
        expect(body.getAttribute('data-change')).toBe('data-leading tspan-y');
        expect(Number(body.getAttribute('data-leading'))).toBe(leading);
        expect(Number(body.getAttribute('font-size'))).toBe(size);
        expect(body.getAttribute('font-family')).toBe('PVLeadingSans');
        expect(body.getAttribute('font-weight')).toBe('400');
        expect(body.textContent).toBe(body.getAttribute('data-copy'));
        expect(body.getAttribute('aria-label')).toBe(body.getAttribute('data-copy'));
        const lines = Array.from(body.children);
        expect(lines).toHaveLength(count);
        for (const [i, line] of lines.entries()) {
          expect(line.localName).toBe('tspan');
          expect(line.getAttribute('x')).toBe(body.getAttribute('x'));
          expect(Number(line.getAttribute('y'))).toBe(Number(body.getAttribute('y')) + i * leading);
          line.setAttribute('y', '0');
        }
        body.removeAttribute('data-leading');
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );
  it.each(examples)(
    '$name preserves exact local photos, paper and font bytes',
    ({ name, photo }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', 'scale-print-stage-v2.jpg'],
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
  it.each(examples)('$name preserves complete artifacts in its narrow version', ({ name }) => {
    const wide = svg(name),
      mobile = svg(name + '-mobile');
    for (const variant of ['before', 'after'])
      expect(normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant)))).toBe(
        true,
      );
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
  });
  it('keeps the saved copy, line breaks and geometry aligned with its production record', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-leading-layouts.json'),
        'utf8',
      ),
    ) as {
      examples: {
        name: string;
        copy: string;
        lines: string[];
        x: number;
        y: number;
        size: number;
        measure: number;
      }[];
    };
    for (const s of record.examples)
      for (const variant of ['before', 'after']) {
        const body = group(svg(s.name), variant).querySelector('[data-element="adjusted-text"]')!;
        expect(body.getAttribute('data-copy')).toBe(s.copy);
        expect(body.getAttribute('x')).toBe(String(s.x));
        expect(body.getAttribute('y')).toBe(String(s.y));
        expect(body.getAttribute('font-size')).toBe(String(s.size));
        expect(body.getAttribute('data-measure')).toBe(String(s.measure));
        expect(Array.from(body.children).map((line) => line.textContent?.trimEnd())).toEqual(
          s.lines,
        );
      }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

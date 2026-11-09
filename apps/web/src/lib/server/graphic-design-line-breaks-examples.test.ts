// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'breaks-phrase-poster',
    photo: 'form-open-studios-photo.jpg',
    size: 64,
    count: 2,
    leading: 72,
    measure: 480,
  },
  {
    name: 'breaks-value-unit',
    photo: 'explicit-tableware-photo.jpg',
    size: 28,
    count: 2,
    leading: 40,
    measure: 300,
  },
  {
    name: 'breaks-paragraph-ending',
    photo: 'audience-workspace-photo.jpg',
    size: 22,
    count: 5,
    leading: 31,
    measure: 460,
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
describe('Control Line Breaks controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only whole-word allocation across fixed line geometry',
    ({ name, size, count, leading, measure }) => {
      const doc = svg(name),
        variants = [normalized(group(doc, 'before')), normalized(group(doc, 'after'))];
      for (const g of variants) {
        expect(g.querySelectorAll('[data-change]')).toHaveLength(1);
        const body = g.querySelector('[data-element="adjusted-text"]')!,
          copy = body.getAttribute('data-copy')!;
        expect(body.getAttribute('data-change')).toBe('reflow');
        expect(body.getAttribute('font-family')).toBe('PVBreakSans');
        expect(body.getAttribute('font-weight')).toBe('400');
        expect(body.getAttribute('font-kerning')).toBe('normal');
        expect(body.getAttribute('font-size')).toBe(String(size));
        expect(body.getAttribute('data-leading')).toBe(String(leading));
        expect(body.getAttribute('data-measure')).toBe(String(measure));
        expect(body.textContent).toBe(copy);
        expect(body.getAttribute('aria-label')).toBe(copy);
        const lines = Array.from(body.children);
        expect(lines).toHaveLength(count);
        for (const [i, line] of lines.entries()) {
          expect(line.localName).toBe('tspan');
          expect(line.getAttribute('x')).toBe(body.getAttribute('x'));
          expect(Number(line.getAttribute('y'))).toBe(Number(body.getAttribute('y')) + i * leading);
        }
        body.replaceChildren(doc.createTextNode(copy));
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
  it('preserves line records and demonstrates each declared editorial change', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-line-breaks-layouts.json'),
        'utf8',
      ),
    ) as {
      examples: {
        name: string;
        copy: string;
        before: string[];
        after: string[];
        widths: { before: number[]; after: number[] };
        measure: number;
      }[];
    };
    for (const s of record.examples)
      for (const variant of ['before', 'after'] as const) {
        const body = group(svg(s.name), variant).querySelector('[data-element="adjusted-text"]')!;
        expect(body.textContent).toBe(s.copy);
        expect(Array.from(body.children).map((line) => line.textContent?.trimEnd())).toEqual(
          s[variant],
        );
        expect(s.widths[variant].every((w) => w <= s.measure)).toBe(true);
      }
    expect(record.examples[0].after).toEqual(['Make room', 'for new ideas']);
    expect(record.examples[1].after[1]).toContain('320 ml.');
    const ending = record.examples[2];
    expect(ending.before.at(-1)).toBe('reference.');
    expect(ending.after.at(-1)).toBe('your booking reference.');
    expect(ending.before.slice(0, 3)).toEqual(ending.after.slice(0, 3));
    const doc = svg(ending.name),
      a = Array.from(
        group(doc, 'before').querySelector('[data-element="adjusted-text"]')!.children,
      ),
      b = Array.from(group(doc, 'after').querySelector('[data-element="adjusted-text"]')!.children);
    for (let i = 0; i < 3; i++) expect(a[i].isEqualNode(b[i])).toBe(true);
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'letter-spacing-capitals',
    photo: 'explicit-tableware-photo.jpg',
    before: 0,
    after: 2.24,
    size: 28,
    kind: 'tracking',
  },
  {
    name: 'letter-spacing-headline',
    photo: 'audience-workspace-photo.jpg',
    before: 5.12,
    after: 0,
    size: 64,
    kind: 'tracking',
  },
  {
    name: 'letter-spacing-pair',
    photo: 'core-message-coffee-photo.jpg',
    before: 0,
    after: -4.752,
    size: 72,
    kind: 'pair',
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
  clone.removeAttribute('data-detail-artifact');
  return clone;
};
describe('Adjust Letter Spacing controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared tracking or pair interval',
    ({ name, before, after, size, kind }) => {
      const doc = svg(name),
        variants = [normalized(group(doc, 'before')), normalized(group(doc, 'after'))];
      for (const [i, g] of variants.entries()) {
        expect(g.querySelectorAll('[data-change]')).toHaveLength(1);
        const adjusted = g.querySelector('[data-element="spacing-adjustment"]')!,
          text = adjusted.querySelector('text')!;
        expect(text.getAttribute('font-size')).toBe(String(size));
        expect(text.getAttribute('font-family')).toBe('PVTrackingSans');
        expect(text.getAttribute('font-weight')).toBe('400');
        if (kind === 'tracking') {
          expect(adjusted.getAttribute('data-change')).toBe('letter-spacing');
          expect(text.getAttribute('font-kerning')).toBe('normal');
          expect(text.getAttribute('letter-spacing')).toBe(String(i ? after : before));
          text.setAttribute('letter-spacing', '0');
        } else {
          expect(adjusted.getAttribute('data-change')).toBe('pair-dx');
          expect(text.getAttribute('font-kerning')).toBe('none');
          expect(text.textContent).toBe('Tonic');
          expect(text.querySelector('[data-element="pair-left"]')?.textContent).toBe('T');
          const tail = text.querySelector('[data-element="pair-tail"]')!;
          expect(tail.textContent).toBe('onic');
          expect(tail.getAttribute('dx')).toBe(String(i ? after : before));
          tail.setAttribute('dx', '0');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );
  it.each(examples)(
    '$name preserves the exact font, photograph and paper sources',
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
  it.each(examples)(
    '$name reuses exact artifacts in wide/narrow views and close-ups with matched crops and guides',
    ({ name }) => {
      const wide = svg(name),
        mobile = svg(name + '-mobile');
      for (const doc of [wide, mobile]) {
        for (const variant of ['before', 'after']) {
          expect(
            normalized(group(doc, variant)).isEqualNode(
              normalized(doc.querySelector(`[data-detail-artifact="${variant}"]`)!),
            ),
          ).toBe(true);
          expect(
            normalized(group(doc, variant)).isEqualNode(normalized(group(wide, variant))),
          ).toBe(true);
        }
        const details = ['before', 'after'].map((v) => doc.querySelector(`[data-detail="${v}"]`)!);
        for (const attribute of ['width', 'height', 'viewBox'])
          expect(details[0].getAttribute(attribute)).toBe(details[1].getAttribute(attribute));
        expect(
          details[0]
            .querySelector('[data-guides]')
            ?.isEqualNode(details[1].querySelector('[data-guides]')!),
        ).toBe(true);
      }
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    },
  );
  it('records the real font pair difference and preserves complete specimen wording and anchors', () => {
    const records = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-letter-spacing-layouts.json'),
        'utf8',
      ),
    ) as {
      examples: {
        name: string;
        kind: string;
        value: string;
        size: number;
        x: number;
        y: number;
        before: number;
        after: number;
        metrics: { pairKerned: number; pairUnkerned: number };
      }[];
    };
    for (const record of records.examples) {
      for (const variant of ['before', 'after']) {
        const text = group(svg(record.name), variant).querySelector(
          '[data-element="adjusted-text"]',
        )!;
        expect(text.textContent).toBe(record.value);
        expect(text.getAttribute('x')).toBe(String(record.x));
        expect(text.getAttribute('y')).toBe(String(record.y));
      }
      if (record.kind === 'pair')
        expect(record.after).toBeCloseTo(
          record.metrics.pairKerned - record.metrics.pairUnkerned,
          3,
        );
    }
    expect(records.examples[0].after / records.examples[0].size).toBeCloseTo(0.08, 8);
    expect(records.examples[1].before / records.examples[1].size).toBeCloseTo(0.08, 8);
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'optical-quotation',
    photo: 'audience-workspace-photo.jpg',
    after: [-18.744, 0],
    size: 44,
  },
  { name: 'optical-invitation', photo: 'form-open-studios-photo.jpg', after: [9.462, 0], size: 76 },
  { name: 'optical-shop-label', photo: 'explicit-tableware-photo.jpg', after: [0, 6.12], size: 72 },
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
describe('Apply Optical Alignment controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes one declared translation without changing any other artifact properties',
    ({ name, after, size }) => {
      const doc = svg(name);
      const variants = [normalized(group(doc, 'before')), normalized(group(doc, 'after'))];
      for (const [index, g] of variants.entries()) {
        expect(g.querySelectorAll('[data-change]')).toHaveLength(1);
        const adjusted = g.querySelector('[data-element="optical-adjustment"]')!;
        expect(adjusted.getAttribute('data-change')).toBe('transform');
        expect(adjusted.getAttribute('transform')).toBe(
          `translate(${index ? after[0] : 0} ${index ? after[1] : 0})`,
        );
        const text = adjusted.querySelector('text')!;
        expect(text.getAttribute('font-size')).toBe(String(size));
        expect(text.getAttribute('font-family')).toBe('PVOpticalSans');
        expect(text.getAttribute('font-weight')).toBe('400');
        adjusted.setAttribute('transform', 'translate(0 0)');
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
      expect(group(doc, 'before').querySelectorAll('[data-guides]')).toHaveLength(0);
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
  it('records the numerical starting references and retains meaningful specimen content', () => {
    const records = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-optical-layouts.json'),
        'utf8',
      ),
    ) as {
      examples: {
        name: string;
        before: number[];
        after: number[];
        baseline?: number;
        metrics: {
          mark?: { width: number };
          whole?: { width: number };
          words?: { width: number };
          caps?: { ascent: number; descent: number };
        };
      }[];
    };
    const [quote, invitation, label] = records.examples;
    expect(quote.after[0]).toBeCloseTo(-quote.metrics.mark!.width, 3);
    expect(invitation.after[0]).toBeCloseTo(
      (invitation.metrics.whole!.width - invitation.metrics.words!.width) / 2,
      3,
    );
    expect(
      label.baseline! +
        label.after[1] -
        (label.metrics.caps!.ascent - label.metrics.caps!.descent) / 2,
    ).toBeCloseTo(540, 3);
    expect(group(svg(quote.name), 'after').textContent).toContain('“Room to make,');
    expect(group(svg(invitation.name), 'after').textContent).toContain('Come in.');
    expect(
      group(svg(label.name), 'after').querySelector('[data-element="label"]')?.textContent,
    ).toBe('OPEN');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

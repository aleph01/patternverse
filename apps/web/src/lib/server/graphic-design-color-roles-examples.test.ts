// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'color-roles-primary-actions',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    ids: ['desk-price', 'room-button'],
    differences: 2,
  },
  {
    name: 'color-roles-studio-report',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['bar-1-0', 'bar-1-1'],
    differences: 2,
  },
  {
    name: 'color-roles-order-status',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['payment-background'],
    differences: 1,
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
  return clone;
};
const element = (g: Element, id: string) => g.querySelector(`[data-element="${id}"]`)!;
describe('Assign Consistent Color Roles controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared fill assignments',
    ({ name, ids, differences }) => {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(
        ids.filter(
          (id) =>
            element(before, id).getAttribute('fill') !== element(after, id).getAttribute('fill'),
        ),
      ).toHaveLength(differences);
      const palette = (g: Element) =>
        [
          ...new Set(
            Array.from(g.querySelectorAll('[fill]'))
              .map((e) => e.getAttribute('fill'))
              .filter((v) => v?.startsWith('#')),
          ),
        ].sort();
      expect(palette(before)).toEqual(palette(after));
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe('fill');
          e.removeAttribute('fill');
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVRolesSans');
          expect(e.getAttribute('font-weight')).toBe('400');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );

  it.each(examples)(
    '$name embeds exact source photographs, presentation and font bytes',
    ({ name, photo, stage }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', stage],
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
    '$name preserves complete artifacts and definitions in the narrow version',
    ({ name }) => {
      const wide = svg(name),
        mobile = svg(name + '-mobile');
      for (const variant of ['before', 'after'])
        expect(
          normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant))),
        ).toBe(true);
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    },
  );

  it('preserves the actual role mappings, scales and non-color identification', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-color-roles-layouts.json'),
        'utf8',
      ),
    );
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant);
        expect(record.examples[i].declaredFills[v]).toEqual(
          spec.ids.map((id) => ({ element: id, fill: element(g, id).getAttribute('fill') })),
        );
      }
    const actions = group(svg(examples[0].name), 'after');
    expect(element(actions, 'desk-button').getAttribute('fill')).toBe('#225c91');
    expect(element(actions, 'room-button').getAttribute('fill')).toBe('#225c91');
    expect(element(actions, 'desk-price').getAttribute('fill')).toBe('#17352f');
    expect(element(actions, 'room-price').getAttribute('fill')).toBe('#17352f');
    expect(element(actions, 'desk-button-label').textContent).toBe('Book a desk →');
    expect(element(actions, 'room-button-label').textContent).toBe('Reserve a room →');
    const report = svg(examples[1].name);
    for (const variant of ['before', 'after'])
      for (const [p, values] of [
        [42, 28],
        [48, 36],
      ].entries())
        for (const [i, value] of values.entries()) {
          const g = group(report, variant),
            bar = element(g, `bar-${p}-${i}`);
          expect(bar.getAttribute('x')).toBe('200');
          expect(Number(bar.getAttribute('width'))).toBe(value * 6);
          expect(bar.getAttribute('height')).toBe('26');
          expect(element(g, `value-${p}-${i}`).textContent).toBe(String(value));
          expect(element(g, `site-${p}-${i}`).textContent).toBe(['Riverside', 'Hill'][i]);
          if (variant === 'after') expect(bar.getAttribute('fill')).toBe(['#225c91', '#9e3e25'][i]);
        }
    const order = svg(examples[2].name),
      before = group(order, 'before'),
      after = group(order, 'after');
    for (const id of [
      'ready-background',
      'ready-label',
      'address-background',
      'address-label',
      'payment-label',
    ])
      expect(element(before, id).isEqualNode(element(after, id))).toBe(true);
    expect(element(after, 'payment-background').getAttribute('fill')).toBe(
      element(after, 'address-background').getAttribute('fill'),
    );
    expect(element(after, 'ready-background').getAttribute('fill')).not.toBe(
      element(after, 'payment-background').getAttribute('fill'),
    );
    expect(element(after, 'payment-label').textContent).toBe('! Payment outstanding');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

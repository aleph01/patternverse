// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'palette-open-studios',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['invitation', 'date', 'entry', 'address'],
    differences: 4,
  },
  {
    name: 'palette-monthly-report',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['bar-0', 'bar-1', 'bar-2', 'bar-3'],
    differences: 3,
  },
  {
    name: 'palette-booking-screen',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    ids: ['brand', 'headline', 'section', 'booking-title', 'button'],
    differences: 5,
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
const lum = (hex: string) =>
  [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((a, c, i) => a + c * [0.2126, 0.7152, 0.0722][i], 0);

describe('Limit the Palette controlled photographic comparisons', () => {
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
      for (const id of ids)
        expect(
          Math.abs(
            lum(element(before, id).getAttribute('fill')!) -
              lum(element(after, id).getAttribute('fill')!),
          ),
        ).toBeLessThan(0.002);
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe('fill');
          e.removeAttribute('fill');
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVPaletteSans');
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

  it('records exact mappings, consolidates the intended palettes and preserves functional distinctions', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-palette-layouts.json'),
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
    const poster = svg(examples[0].name);
    const textColors = (g: Element) =>
      new Set(Array.from(g.querySelectorAll('text')).map((e) => e.getAttribute('fill')));
    expect(textColors(group(poster, 'before')).size).toBe(6);
    expect(textColors(group(poster, 'after')).size).toBe(2);
    const report = svg(examples[1].name);
    for (const variant of ['before', 'after'])
      for (const [i, value] of [42, 56, 48, 64].entries()) {
        const g = group(report, variant),
          bar = element(g, 'bar-' + i);
        expect(Number(bar.getAttribute('height'))).toBe(value * 3);
        expect(Number(bar.getAttribute('y')) + Number(bar.getAttribute('height'))).toBe(745);
        expect(element(g, 'value-' + i).textContent).toBe(String(value));
      }
    expect(
      new Set(
        Array.from(group(report, 'before').querySelectorAll('[data-change]')).map((e) =>
          e.getAttribute('fill'),
        ),
      ).size,
    ).toBe(4);
    expect(
      new Set(
        Array.from(group(report, 'after').querySelectorAll('[data-change]')).map((e) =>
          e.getAttribute('fill'),
        ),
      ).size,
    ).toBe(1);
    const phone = svg(examples[2].name),
      a = group(phone, 'before'),
      b = group(phone, 'after');
    for (const id of [
      'confirmed-background',
      'confirmed-label',
      'warning-background',
      'warning-title',
      'warning-detail',
    ])
      expect(element(a, id).isEqualNode(element(b, id))).toBe(true);
    expect(element(b, 'confirmed-label').textContent).toBe('✓ Confirmed');
    expect(element(b, 'warning-title').textContent).toBe('! Action needed');
    expect(element(b, 'confirmed-background').getAttribute('fill')).toBe('#dceadc');
    expect(element(b, 'warning-background').getAttribute('fill')).toBe('#f6e6b6');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

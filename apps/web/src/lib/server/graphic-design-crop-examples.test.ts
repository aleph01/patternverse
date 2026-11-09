// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'crop-handbuilding-action',
    photo: 'meaning-handbuilding-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['image-window'],
    differences: 1,
    attribute: 'viewBox',
  },
  {
    name: 'crop-tableware-edge',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['image-window'],
    differences: 1,
    attribute: 'viewBox',
  },
  {
    name: 'crop-room-context',
    photo: 'meaning-enclosed-room-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['image-window'],
    differences: 1,
    attribute: 'viewBox',
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
describe('Crop for Impact controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared crop window',
    ({ name, ids, differences, attribute }) => {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(
        ids.filter(
          (id) =>
            element(before, id).getAttribute(attribute) !==
            element(after, id).getAttribute(attribute),
        ),
      ).toHaveLength(differences);
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe(attribute);
          e.removeAttribute(attribute);
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVCropSans');
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

  it('verifies proportional fitting, bounded windows, exact source guides and three distinct crop decisions', () => {
    const record = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/graphic-design-crop-layouts.json'), 'utf8'),
    );
    for (const [i, spec] of examples.entries()) {
      const d = svg(spec.name),
        mobile = svg(spec.name + '-mobile'),
        r = record.examples[i];
      expect(r.source).toBe(spec.photo);
      expect(r.sourceDimensions).toEqual([1536, 1024]);
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(d, variant),
          frame = element(g, 'image-window'),
          crop = variant === 'before' ? r.before : r.after;
        const [x, y, w, h] = crop;
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(w).toBeGreaterThan(0);
        expect(h).toBeGreaterThan(0);
        expect(x + w).toBeLessThanOrEqual(1536);
        expect(y + h).toBeLessThanOrEqual(1024);
        expect(w / h).toBeCloseTo(r.frame[2] / r.frame[3], 10);
        expect(frame.getAttribute('viewBox')).toBe(crop.join(' '));
        expect(['x', 'y', 'width', 'height'].map((a) => Number(frame.getAttribute(a)))).toEqual(
          r.frame,
        );
        expect(frame.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
        expect(frame.getAttribute('overflow')).toBe('hidden');
        expect(element(g, 'selected-photo').getAttribute('href')).toBe('#photo');
        expect(r.declaredChanges[v]).toEqual([
          { element: 'image-window', attribute: 'viewBox', value: crop.join(' ') },
        ]);
        const guide = d.querySelector(`[data-crop-guide="${variant}"]`)!;
        expect(['x', 'y', 'width', 'height'].map((a) => Number(guide.getAttribute(a)))).toEqual(
          crop.map((n: number) => (n * 360) / 1536),
        );
        expect(guide.getAttribute('stroke-dasharray')).toBe(variant === 'before' ? '8 5' : null);
        for (const [id, tx, ty, copy, size] of r.copy) {
          const t = element(g, id);
          expect(t.textContent).toBe(copy);
          expect([t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('font-size')]).toEqual([
            String(tx),
            String(ty),
            String(size),
          ]);
        }
      }
      const wideGuide = d.querySelector('[data-element="source-guide"]')!,
        mobileGuide = mobile.querySelector('[data-element="source-guide"]')!;
      expect(normalized(wideGuide).isEqualNode(normalized(mobileGuide))).toBe(true);
    }
    const [tighten, pan, widen] = record.examples;
    expect(tighten.after[2]).toBeLessThan(tighten.before[2]);
    expect(tighten.after[3]).toBeLessThan(tighten.before[3]);
    expect(pan.after.slice(1)).toEqual(pan.before.slice(1));
    expect(pan.after[0]).toBeGreaterThan(pan.before[0]);
    expect(widen.after).toEqual([0, 0, 1536, 1024]);
    expect(widen.after[2]).toBeGreaterThan(widen.before[2]);
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

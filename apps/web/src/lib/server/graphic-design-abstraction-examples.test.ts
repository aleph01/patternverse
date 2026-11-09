// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'abstraction-pitcher-category',
    photo: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['photographic-representation', 'abstract-representation'],
    differences: 2,
    attribute: 'opacity',
  },
  {
    name: 'abstraction-room-arrangement',
    photo: 'meaning-enclosed-room-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['photographic-representation', 'abstract-representation'],
    differences: 2,
    attribute: 'opacity',
  },
  {
    name: 'abstraction-seed-packing',
    photo: 'form-seed-packing-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['photographic-representation', 'abstract-representation'],
    differences: 2,
    attribute: 'opacity',
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
describe('Simplify Through Abstraction controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only complementary representation-layer opacities',
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
          expect(e.getAttribute('font-family')).toBe('PVAbstractionSans');
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
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
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

  it('verifies fixed frames, original native models and the information each model must retain', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-abstraction-layouts.json'),
        'utf8',
      ),
    );
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const d = svg(spec.name),
          g = group(d, variant),
          photo = element(g, 'photographic-representation'),
          model = element(g, 'abstract-representation');
        expect(photo.getAttribute('opacity')).toBe(v ? '0' : '1');
        expect(model.getAttribute('opacity')).toBe(v ? '1' : '0');
        expect(record.examples[i].declaredChanges[v]).toEqual(
          spec.ids.map((id) => ({
            element: id,
            attribute: 'opacity',
            value: element(g, id).getAttribute('opacity'),
          })),
        );
        expect(model.querySelector('image,use,filter')).toBeNull();
        expect(model.parentElement?.getAttribute('clip-path')).toBe('url(#representation-clip)');
        const clip = d.querySelector('clipPath rect')!;
        expect(['x', 'y', 'width', 'height'].map((a) => Number(clip.getAttribute(a)))).toEqual([
          65, 220, 480, 320,
        ]);
        const frame = element(g, 'image-window');
        expect(['x', 'y', 'width', 'height'].map((a) => Number(frame.getAttribute(a)))).toEqual(
          record.examples[i].frame,
        );
        expect(frame.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
        for (const [id, x, y, copy, size] of record.examples[i].copy) {
          const t = element(g, id);
          expect(t.textContent).toBe(copy);
          expect(['x', 'y', 'font-size'].map((a) => Number(t.getAttribute(a)))).toEqual([
            x,
            y,
            size,
          ]);
        }
        if (i === 0) {
          for (const feature of ['loop-handle', 'pitcher-body-lip', 'rim', 'base'])
            expect(model.querySelector(`[data-feature="${feature}"]`)).not.toBeNull();
          expect(model.querySelector('[data-feature="loop-handle"]')?.getAttribute('d')).toContain(
            'L900 865',
          );
        }
        if (i === 1) {
          expect(model.querySelectorAll('[data-feature="chair"]')).toHaveLength(2);
          for (const feature of ['table', 'window', 'door', 'room-boundary'])
            expect(model.querySelectorAll(`[data-feature="${feature}"]`)).toHaveLength(1);
          expect(model.textContent).toContain('Window');
          expect(element(g, 'window-label').parentElement?.getAttribute('stroke')).toBe('none');
          expect(element(g, 'door-label').parentElement?.getAttribute('stroke')).toBe('none');
          expect(model.textContent).toContain('Door');
          expect(g.textContent).toContain('Concept arrangement · Not to scale');
        }
        if (i === 2) {
          expect(model.querySelectorAll('[data-seed]')).toHaveLength(10);
          expect(
            Array.from(model.querySelectorAll('[data-seed]')).map((e) =>
              e.getAttribute('data-seed'),
            ),
          ).toEqual(Array.from({ length: 10 }, (_, i) => String(i + 1)));
          for (const feature of ['envelope', 'return-tray', 'arrow-one', 'arrow-two'])
            expect(model.querySelectorAll(`[data-feature="${feature}"]`)).toHaveLength(1);
          expect(g.textContent).toContain('1  Count 10 seeds.');
          expect(g.textContent).toContain('2  Label envelope: name + year.');
          expect(g.textContent).toContain('3  Place in the return tray.');
        }
      }
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

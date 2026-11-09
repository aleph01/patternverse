// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'image-meaning-handbuilding',
    beforePhoto: 'explicit-tableware-photo.jpg',
    afterPhoto: 'meaning-handbuilding-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['selected-photo'],
    differences: 1,
    attribute: 'href',
  },
  {
    name: 'image-meaning-enclosed-room',
    beforePhoto: 'audience-workspace-photo.jpg',
    afterPhoto: 'meaning-enclosed-room-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['selected-photo'],
    differences: 1,
    attribute: 'href',
  },
  {
    name: 'image-meaning-seed-library',
    beforePhoto: 'core-message-library-photo.jpg',
    afterPhoto: 'form-seed-packing-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['selected-photo'],
    differences: 1,
    attribute: 'href',
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
describe('Choose Images for Meaning controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the selected image reference',
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
          expect(e.getAttribute('font-family')).toBe('PVImageMeaningSans');
          expect(e.getAttribute('font-weight')).toBe('400');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );

  it.each(examples)(
    '$name embeds exact source photographs, presentation and font bytes',
    ({ name, beforePhoto, afterPhoto, stage }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo-before', beforePhoto],
        ['photo-after', afterPhoto],
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

  it('keeps full-image fitting, native copy and declared source selections exact', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-image-meaning-layouts.json'),
        'utf8',
      ),
    );
    for (const [i, spec] of examples.entries()) {
      const d = svg(spec.name);
      expect(d.querySelector('image[id="photo-before"]')?.getAttribute('href')).not.toBe(
        d.querySelector('image[id="photo-after"]')?.getAttribute('href'),
      );
      expect(record.examples[i].beforeSource).toBe(spec.beforePhoto);
      expect(record.examples[i].afterSource).toBe(spec.afterPhoto);
      for (const id of ['photo-before', 'photo-after']) {
        const img = d.querySelector(`image[id="${id}"]`)!;
        expect([img.getAttribute('width'), img.getAttribute('height')]).toEqual(['1536', '1024']);
      }
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(d, variant),
          frame = element(g, 'image-window'),
          selection = element(g, 'selected-photo');
        expect(
          ['x', 'y', 'width', 'height', 'viewBox', 'preserveAspectRatio'].map((a) =>
            frame.getAttribute(a),
          ),
        ).toEqual(['65', '155', '480', '320', '0 0 1536 1024', 'xMidYMid meet']);
        expect(selection.getAttribute('href')).toBe(
          variant === 'before' ? '#photo-before' : '#photo-after',
        );
        expect(record.examples[i].declaredChanges[v]).toEqual([
          { element: 'selected-photo', attribute: 'href', value: selection.getAttribute('href') },
        ]);
        for (const [id, x, y, copy, size] of record.examples[i].copy) {
          const t = element(g, id);
          expect(t.textContent).toBe(copy);
          expect([t.getAttribute('x'), t.getAttribute('y'), t.getAttribute('font-size')]).toEqual([
            String(x),
            String(y),
            String(size),
          ]);
        }
        expect(g.textContent).toContain('Illustrative image');
      }
    }
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

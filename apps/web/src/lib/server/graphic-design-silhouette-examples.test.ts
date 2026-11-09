// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isPatternGraphic } from '../illustrations/pattern-graphics';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'silhouette-pitcher-shelf',
    photo: 'figure-ground-pitcher-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['object-tone'],
    differences: 1,
    attribute: 'filter',
  },
  {
    name: 'silhouette-shears-ground',
    photo: 'silhouette-shears-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['object-ground'],
    differences: 1,
    attribute: 'fill',
  },
  {
    name: 'silhouette-maker-detail',
    photo: 'silhouette-maker-cutout.png',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['object-tone'],
    differences: 1,
    attribute: 'filter',
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
describe('Use Silhouettes controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared tone treatment or background fill',
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
          expect(e.getAttribute('font-family')).toBe('PVSilhouetteSans');
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

  it('verifies unchanged alpha, fixed geometry and a deliberately reversed silhouette application', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-silhouette-layouts.json'),
        'utf8',
      ),
    );
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const d = svg(spec.name),
          g = group(d, variant),
          r = record.examples[i];
        expect(r.declaredChanges[v]).toEqual(
          spec.ids.map((id) => ({
            element: id,
            attribute: spec.attribute,
            value: element(g, id).getAttribute(spec.attribute),
          })),
        );
        expect(element(g, 'object-tone').getAttribute('filter')).toBe(r.filters[v]);
        expect(element(g, 'object-ground').getAttribute('fill')).toBe(r.grounds[v]);
        const frame = element(g, 'image-window');
        expect(['x', 'y', 'width', 'height'].map((a) => Number(frame.getAttribute(a)))).toEqual(
          r.frame,
        );
        expect(frame.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
        expect(frame.getAttribute('viewBox')).toBe('0 0 ' + r.sourceDimensions.join(' '));
        expect(element(g, 'selected-photo').getAttribute('href')).toBe('#photo');
        expect(element(g, 'object-tone').parentElement?.getAttribute('clip-path')).toBe(
          'url(#image-clip)',
        );
        const filter = d.querySelector('filter')!;
        expect(filter.getAttribute('color-interpolation-filters')).toBe('sRGB');
        expect(filter.getAttribute('filterUnits')).toBe('userSpaceOnUse');
        expect(['x', 'y', 'width', 'height'].map((a) => Number(filter.getAttribute(a)))).toEqual(
          r.frame,
        );
        expect(filter.querySelectorAll('*')).toHaveLength(1);
        const matrix = d
          .querySelector('feColorMatrix')!
          .getAttribute('values')!
          .split(/\s+/)
          .map(Number);
        expect(matrix).toHaveLength(20);
        expect(matrix.slice(15)).toEqual([0, 0, 0, 1, 0]);
        for (const rgba of [
          [0, 0, 0, 0],
          [1, 1, 1, 1],
          [1, 0.2, 0.7, 0.45],
          [0.4, 0.7, 1, 0.99],
        ]) {
          const out = [0, 1, 2, 3].map((row) =>
            matrix
              .slice(row * 5, row * 5 + 4)
              .reduce((sum, c, i) => sum + c * rgba[i], matrix[row * 5 + 4]),
          );
          expect(out).toEqual([46 / 255, 72 / 255, 54 / 255, rgba[3]]);
        }
        expect(d.querySelectorAll('mask,feMorphology,feComponentTransfer')).toHaveLength(0);
        for (const [id, x, y, copy, size] of r.copy) {
          const t = element(g, id);
          expect(t.textContent).toBe(copy);
          expect(['x', 'y', 'font-size'].map((a) => Number(t.getAttribute(a)))).toEqual([
            x,
            y,
            size,
          ]);
        }
      }
    expect(record.examples[0].filters).toEqual(['none', 'url(#silhouette-tone)']);
    expect(record.examples[1].filters).toEqual(['url(#silhouette-tone)', 'url(#silhouette-tone)']);
    expect(record.examples[2].filters).toEqual(['url(#silhouette-tone)', 'none']);
    for (const file of ['silhouette-shears-cutout.png', 'silhouette-maker-cutout.png']) {
      const b = readFileSync(resolve(assets, file));
      expect(b.subarray(1, 4).toString()).toBe('PNG');
      expect(b[25]).toBe(6);
    }
  });

  it('retains the original silhouette mark and its handle opening in the editorial archive', () => {
    const archive = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-original-articles.json'),
        'utf8',
      ),
    );
    const mark = archive.graphics.find(
      (g: { id: string }) => g.id === 'graphic-design-use-silhouettes',
    );
    expect(isPatternGraphic({ version: 2, ...mark })).toBe(true);
    expect(mark.reading).toContain('opening');
    expect(mark.paths[0].d.split('Z')).toHaveLength(3);
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

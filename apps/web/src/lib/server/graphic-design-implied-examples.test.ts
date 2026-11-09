// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Example = { name: string; sources: Record<string, string>; changes: Record<string, string[]> };
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples: Example[] = [
  {
    name: 'implied-workshop-frame',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'frame-middles': ['opacity'] },
  },
  {
    name: 'implied-product-circle',
    sources: { photo: 'figure-ground-pitcher-cutout.png', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'ring-behind': ['opacity'], 'ring-in-front': ['opacity'] },
  },
  {
    name: 'implied-print-file',
    sources: { photo: 'scale-workshop-photo-v2.jpg', stage: 'audience-phone-stage.jpg' },
    changes: { 'file-top': ['d'], 'file-fold': ['opacity'] },
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
const group = (document: Document, variant: string) =>
  document.querySelector(`[data-variant="${variant}"]`)!;
const part = (element: Element, id: string) => element.querySelector(`[data-element="${id}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
describe('Use Implied Forms controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared fragment visibility, layer assignment or icon cue',
    ({ name, changes }) => {
      const document = svg(name),
        before = normalized(group(document, 'before')),
        after = normalized(group(document, 'after'));
      expect(before.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
      expect(after.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
      for (const [id, attributes] of Object.entries(changes)) {
        const a = part(before, id),
          b = part(after, id);
        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(a.getAttribute('data-change')?.split(' ')).toEqual(attributes);
        for (const attribute of attributes) {
          expect(['d', 'opacity']).toContain(attribute);
          expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
          a.removeAttribute(attribute);
          b.removeAttribute(attribute);
        }
      }
      expect(before.isEqualNode(after)).toBe(true);
    },
  );
  it.each(examples)(
    '$name embeds the identical local image and paper sources',
    ({ name, sources }) => {
      const document = svg(name);
      for (const [id, file] of Object.entries(sources))
        expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
        );
    },
  );
  it.each(examples)('$name preserves the complete variants in its stacked view', ({ name }) => {
    const wide = svg(name),
      mobile = svg(name + '-mobile');
    for (const variant of ['before', 'after'])
      expect(normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant)))).toBe(
        true,
      );
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
  });
  it('preserves the frame extent, shows one identical circle in the selected layer, and restores a document cue without closing all gaps', () => {
    const path = (el: Element) => {
      let x = 0,
        y = 0,
        length = 0;
      const points: number[][] = [];
      for (const match of el.getAttribute('d')!.matchAll(/([MHVL])([^MHVL]+)/g)) {
        const n = match[2].trim().split(/[ ,]+/).map(Number),
          old = [x, y];
        if (match[1] === 'H') x = n[0];
        else if (match[1] === 'V') y = n[0];
        else {
          x = n[0];
          y = n[1];
        }
        points.push([x, y]);
        if (match[1] !== 'M') length += Math.hypot(x - old[0], y - old[1]);
      }
      return { points, length };
    };
    const bounds = (points: number[][]) => [
      Math.min(...points.map((p) => p[0])),
      Math.min(...points.map((p) => p[1])),
      Math.max(...points.map((p) => p[0])),
      Math.max(...points.map((p) => p[1])),
    ];
    const frame = svg('implied-workshop-frame'),
      before = group(frame, 'before'),
      after = group(frame, 'after'),
      corners = path(part(after, 'frame-corners')),
      middles = path(part(after, 'frame-middles')),
      extent = bounds(corners.points);
    expect(part(before, 'frame-middles').getAttribute('opacity')).toBe('1');
    expect(part(after, 'frame-middles').getAttribute('opacity')).toBe('0');
    expect(part(after, 'frame-corners').getAttribute('d')?.match(/M/g)).toHaveLength(4);
    expect(corners.length + middles.length).toBe(
      2 * (extent[2] - extent[0] + (extent[3] - extent[1])),
    );
    expect(corners.length).toBeLessThan(corners.length + middles.length);
    for (const id of ['offer', 'date', 'inclusion', 'welcome']) {
      const el = part(after, id);
      expect(Number(el.getAttribute('x'))).toBeGreaterThan(extent[0]);
      expect(Number(el.getAttribute('y'))).toBeGreaterThan(extent[1]);
      expect(Number(el.getAttribute('y'))).toBeLessThan(extent[3]);
    }
    const product = svg('implied-product-circle');
    for (const variant of ['before', 'after']) {
      const g = group(product, variant),
        behind = part(g, 'ring-behind'),
        front = part(g, 'ring-in-front'),
        children = Array.from(g.children);
      expect(behind.getAttribute('href')).toBe(front.getAttribute('href'));
      expect(Number(behind.getAttribute('opacity')) + Number(front.getAttribute('opacity'))).toBe(
        1,
      );
      expect(children.indexOf(behind)).toBeLessThan(children.indexOf(part(g, 'pitcher')));
      expect(children.indexOf(front)).toBeGreaterThan(children.indexOf(part(g, 'pitcher')));
      expect(behind.getAttribute('opacity')).toBe(variant === 'after' ? '1' : '0');
    }
    const file = svg('implied-print-file'),
      fileBefore = group(file, 'before'),
      fileAfter = group(file, 'after');
    const iconBounds = (g: Element) =>
      bounds(
        ['file-lower-left', 'file-lower-right', 'file-top', 'file-fold']
          .map((id) => part(g, id))
          .filter((el) => el.getAttribute('opacity') !== '0')
          .flatMap((el) => path(el).points),
      );
    expect(iconBounds(fileBefore)).toEqual(iconBounds(fileAfter));
    expect(part(fileBefore, 'file-top').getAttribute('d')).not.toContain('L');
    expect(part(fileAfter, 'file-top').getAttribute('d')).toContain('L');
    expect(part(fileBefore, 'file-fold').getAttribute('opacity')).toBe('0');
    expect(part(fileAfter, 'file-fold').getAttribute('opacity')).toBe('1');
    expect(
      part(fileAfter, 'file-lower-left').isEqualNode(part(fileBefore, 'file-lower-left')),
    ).toBe(true);
    expect(
      part(fileAfter, 'file-lower-right').isEqualNode(part(fileBefore, 'file-lower-right')),
    ).toBe(true);
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

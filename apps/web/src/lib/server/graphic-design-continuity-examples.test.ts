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
    name: 'continuity-open-studio',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'right-line': ['d'] },
  },
  {
    name: 'continuity-visit-connections',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'bowl-route': ['d'], 'tour-route': ['d'] },
  },
  {
    name: 'continuity-booking-gap',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'missing-bridge': ['opacity'] },
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
describe('Establish Visual Continuity controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared geometry or bridge visibility',
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
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
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
  it('makes the diagonal collinear, preserves option endpoints and exposes the unrecorded interval', () => {
    const numbers = (el: Element) =>
      el
        .getAttribute('d')!
        .match(/-?\d+(?:\.\d+)?/g)!
        .map(Number);
    const poster = svg('continuity-open-studio');
    const cross = (a: number[], b: number[]) => a[0] * b[1] - a[1] * b[0];
    for (const variant of ['before', 'after']) {
      const g = group(poster, variant),
        left = numbers(part(g, 'left-line')),
        right = numbers(part(g, 'right-line'));
      const direction = [left[2] - left[0], left[3] - left[1]],
        offset = [right[0] - left[0], right[1] - left[1]];
      if (variant === 'before') expect(cross(direction, offset)).not.toBe(0);
      else expect(cross(direction, offset)).toBe(0);
      expect(cross(direction, [right[2] - right[0], right[3] - right[1]])).toBe(0);
    }
    const diagram = svg('continuity-visit-connections'),
      before = group(diagram, 'before'),
      after = group(diagram, 'after');
    const beforeDirections: number[][] = [],
      afterDirections: number[][] = [];
    for (const id of ['bowl-route', 'tour-route']) {
      const a = numbers(part(before, id)),
        b = numbers(part(after, id));
      expect(a.slice(0, 2)).toEqual(b.slice(0, 2));
      expect(a.slice(-2)).toEqual(b.slice(-2));
      const middle = a.slice(6, 8),
        incoming = [middle[0] - a[4], middle[1] - a[5]],
        outgoing = [a[8] - middle[0], a[9] - middle[1]];
      expect(cross(incoming, outgoing)).toBe(0);
      beforeDirections.push(incoming);
      afterDirections.push([b[2] - b[0], b[3] - b[1]]);
    }
    expect(cross(beforeDirections[0], beforeDirections[1])).toBe(0);
    expect(cross(afterDirections[0], afterDirections[1])).not.toBe(0);
    const chart = svg('continuity-booking-gap'),
      chartBefore = group(chart, 'before'),
      chartAfter = group(chart, 'after');
    expect(part(chartBefore, 'missing-bridge').getAttribute('opacity')).toBe('1');
    expect(part(chartAfter, 'missing-bridge').getAttribute('opacity')).toBe('0');
    expect(
      part(chartBefore, 'booking-series').isEqualNode(part(chartAfter, 'booking-series')),
    ).toBe(true);
    expect(part(chartAfter, 'booking-series').getAttribute('d')?.match(/M/g)).toHaveLength(2);
    const bridge = numbers(part(chartAfter, 'missing-bridge'));
    for (const [index, id] of [
      [0, 'point-1'],
      [2, 'point-3'],
    ] as const) {
      const point = part(chartAfter, id);
      expect(bridge.slice(index, index + 2)).toEqual([
        Number(point.getAttribute('cx')),
        Number(point.getAttribute('cy')),
      ]);
    }
    expect(chartAfter.querySelector('[data-element="point-2"]')).toBeNull();
    expect([0, 1, 2, 3, 4].map((i) => part(chartAfter, 'value-' + i).textContent)).toEqual([
      '12',
      '18',
      '—',
      '24',
      '20',
    ]);
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

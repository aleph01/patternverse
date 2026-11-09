// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Example = { name: string; photo: string; stage: string; changes: Record<string, string[]> };
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples: Example[] = [
  {
    name: 'alignment-repair-poster',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    changes: {
      deck: ['transform'],
      'practical-details': ['transform'],
      'web-address': ['transform'],
    },
  },
  {
    name: 'alignment-cost-sheet',
    photo: 'scale-workshop-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
    changes: { 'amount-column': ['transform', 'text-anchor'] },
  },
  {
    name: 'alignment-workshop-card',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    changes: { 'card-copy': ['transform'] },
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
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
const position = (element: Element) => {
  const match = element.getAttribute('transform')?.match(/^translate\(([\d.]+) ([\d.]+)\)$/);
  expect(match).toBeTruthy();
  return [Number(match![1]), Number(match![2])];
};
const part = (element: Element, id: string) => element.querySelector(`[data-element="${id}"]`)!;
describe('Align to Common Edges photographic comparisons', () => {
  it.each(examples)(
    '$name changes only declared horizontal alignment attributes',
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
        expect(position(a)[1]).toBe(position(b)[1]);
        for (const attribute of attributes) {
          expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
          a.removeAttribute(attribute);
          b.removeAttribute(attribute);
        }
      }
      expect(before.isEqualNode(after)).toBe(true);
    },
  );
  it.each(examples)(
    '$name embeds the exact shared photograph and presentation source',
    ({ name, photo, stage }) => {
      const document = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', stage],
      ])
        expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
        );
      for (const variant of ['before', 'after'])
        expect(group(document, variant).querySelector('use[href="#photo"]')).not.toBeNull();
    },
  );
  it.each(examples)(
    '$name preserves the complete comparisons in its narrow version',
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
  it('makes the declared edge relationships while keeping numeric meaning and nested references intact', () => {
    const poster = group(svg('alignment-repair-poster'), 'after');
    const edge = Number(part(poster, 'headline').getAttribute('x'));
    expect(Number(part(poster, 'photograph').getAttribute('x'))).toBe(edge);
    for (const id of ['deck', 'practical-details', 'web-address'])
      expect(position(part(poster, id))[0]).toBe(edge);
    const costs = group(svg('alignment-cost-sheet'), 'after'),
      column = part(costs, 'amount-column');
    expect(column.getAttribute('text-anchor')).toBe('end');
    const image = part(costs, 'photograph');
    expect(position(column)[0]).toBe(
      Number(image.getAttribute('x')) + Number(image.getAttribute('width')),
    );
    const amounts = ['room-cost', 'materials-cost', 'printing-cost'].map((id) =>
      Number(part(costs, id).textContent),
    );
    expect(amounts.reduce((sum, value) => sum + value, 0)).toBe(
      Number(part(costs, 'total-cost').textContent),
    );
    for (const value of column.querySelectorAll('text'))
      expect(Number(value.getAttribute('x'))).toBe(0);
    const card = group(svg('alignment-workshop-card'), 'after');
    const inset = Number(part(card, 'photograph').getAttribute('x'));
    expect(position(part(card, 'card-copy'))[0]).toBe(inset);
    expect(Number(part(card, 'booking-button').getAttribute('x'))).toBe(inset);
    expect(inset).toBeGreaterThan(Number(part(card, 'card-boundary').getAttribute('x')));
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

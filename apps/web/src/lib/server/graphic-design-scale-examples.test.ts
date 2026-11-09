// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  { name: 'scale-event-poster-photographic', photo: 'scale-greenhouse-photo-v2.jpg', changes: 7 },
  {
    name: 'scale-workshop-promotion-photographic',
    photo: 'scale-workshop-photo-v2.jpg',
    changes: 3,
  },
  { name: 'scale-report-metrics-photographic', photo: 'scale-delivery-photo-v2.jpg', changes: 3 },
];

const readSvg = (name: string) => {
  const source = readFileSync(resolve(assets, `${name}.svg`), 'utf8');
  const document = new DOMParser().parseFromString(source, 'image/svg+xml');
  expect(document.querySelector('parsererror'), name).toBeNull();
  return document;
};

const variant = (document: Document, name: string) => {
  const element = document.querySelector(`[data-variant="${name}"]`);
  expect(element).not.toBeNull();
  return element!;
};

const normalize = (element: Element, scale = false) => {
  const copy = element.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (scale) {
    for (const node of copy.querySelectorAll('[data-scale]')) {
      const attribute = node.getAttribute('data-scale')!;
      expect(['font-size', 'transform']).toContain(attribute);
      if (attribute === 'transform') {
        expect(node.getAttribute(attribute)).toMatch(/^scale\([\d.]+\)$/);
      }
      node.removeAttribute(attribute);
    }
  }
  return copy;
};

describe('Graphic Design scale-only photographic comparisons', () => {
  it.each(examples)('$name changes only the marked scale attributes', ({ name, changes }) => {
    const svg = readSvg(name);
    const before = variant(svg, 'before');
    const after = variant(svg, 'after');
    const beforeScaled = [...before.querySelectorAll('[data-scale]')];
    const afterScaled = [...after.querySelectorAll('[data-scale]')];
    expect(beforeScaled).toHaveLength(changes);
    expect(afterScaled).toHaveLength(changes);
    beforeScaled.forEach((node, index) => {
      const counterpart = afterScaled[index];
      const attribute = node.getAttribute('data-scale')!;
      expect(counterpart.getAttribute('data-element')).toBe(node.getAttribute('data-element'));
      expect(counterpart.getAttribute(attribute)).not.toBe(node.getAttribute(attribute));
    });
    expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
  });

  it.each(examples)('$name reuses the exact local photo and paper bytes', ({ name, photo }) => {
    const svg = readSvg(name);
    for (const [id, filename] of [
      ['photo', photo],
      ['stage', 'scale-print-stage-v2.jpg'],
    ]) {
      const image = svg.querySelector(`defs image[id="${id}"]`)!;
      expect(image).not.toBeNull();
      expect(image.getAttribute('href')).toBe(
        `data:image/jpeg;base64,${readFileSync(resolve(assets, filename)).toString('base64')}`,
      );
    }
    for (const name of ['before', 'after']) {
      const group = variant(svg, name);
      expect(group.querySelector('[data-element="paper-and-lighting"]')?.getAttribute('href')).toBe(
        '#stage',
      );
      expect(group.querySelector('[data-element="photograph"] use')?.getAttribute('href')).toBe(
        '#photo',
      );
    }
  });

  it.each(examples)(
    '$name preserves the same designs in its stacked mobile version',
    ({ name }) => {
      const wide = readSvg(name);
      const mobile = readSvg(`${name}-mobile`);
      for (const name of ['before', 'after']) {
        expect(normalize(variant(wide, name)).isEqualNode(normalize(variant(mobile, name)))).toBe(
          true,
        );
      }
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    },
  );

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

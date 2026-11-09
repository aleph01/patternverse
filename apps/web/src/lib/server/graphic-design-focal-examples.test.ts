// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'focal-open-studios',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    intervention: 'weight',
    count: 1,
  },
  {
    name: 'focal-pottery-price',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    intervention: 'isolation',
    count: 1,
  },
  {
    name: 'focal-booking-action',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    intervention: 'secondary-paint',
    count: 4,
  },
];
const svg = (name: string) => {
  const document = new DOMParser().parseFromString(
    readFileSync(resolve(assets, `${name}.svg`), 'utf8'),
    'image/svg+xml',
  );
  expect(document.querySelector('parsererror')).toBeNull();
  return document;
};
const group = (document: Document, variant: string) =>
  document.querySelector(`[data-variant="${variant}"]`)!;
const normalize = (node: Element, changes = false) => {
  const copy = node.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (changes)
    for (const target of copy.querySelectorAll('[data-intervention]')) {
      switch (target.getAttribute('data-intervention')) {
        case 'weight':
          target.setAttribute('font-weight', '400');
          break;
        case 'isolation':
          target.setAttribute('transform', 'translate(65 725)');
          break;
        case 'secondary-paint':
          target.setAttribute('fill', 'shared-paint-placeholder');
          break;
      }
    }
  return copy;
};
const words = (node: Element) =>
  [...node.querySelectorAll('text')].map((e) => e.textContent).join(' ');

describe('Establish a Focal Point photographic comparisons', () => {
  it.each(examples)('$name changes only its declared weight, translation or paints', (example) => {
    const document = svg(example.name),
      before = group(document, 'before'),
      after = group(document, 'after');
    for (const variant of [before, after]) {
      const targets = variant.querySelectorAll('[data-intervention]');
      expect(targets).toHaveLength(example.count);
      expect(
        [...targets].every((t) => t.getAttribute('data-intervention') === example.intervention),
      ).toBe(true);
    }
    expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
    expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
  });
  it.each(examples)(
    '$name embeds exact shared photographic bytes and identical mobile content',
    (example) => {
      const wide = svg(example.name),
        mobile = svg(`${example.name}-mobile`);
      for (const [id, file] of [
        ['photo', example.photo],
        ['stage', example.stage],
      ])
        expect(wide.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          `data:image/jpeg;base64,${readFileSync(resolve(assets, file)).toString('base64')}`,
        );
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
      for (const variant of ['before', 'after'])
        expect(normalize(group(wide, variant)).isEqualNode(normalize(group(mobile, variant)))).toBe(
          true,
        );
    },
  );
  it('distinguishes only the event identity by weight while retaining the supporting program and equal font sizes', () => {
    const document = svg('focal-open-studios'),
      before = group(document, 'before'),
      after = group(document, 'after');
    expect(before.querySelector('[data-element="lead"]')?.getAttribute('font-weight')).toBe('400');
    expect(after.querySelector('[data-element="lead"]')?.getAttribute('font-weight')).toBe('700');
    for (const id of ['lead', 'talks', 'shop'])
      expect(after.querySelector(`[data-element="${id}"]`)?.getAttribute('font-size')).toBe('50');
    for (const id of ['talks', 'shop'])
      expect(after.querySelector(`[data-element="${id}"]`)?.getAttribute('font-weight')).toBe(
        '400',
      );
    for (const detail of [
      'Sat 18 May · 11:00–17:00',
      'Yard Studios · 8 Mill Lane',
      'Free entry · All ages welcome',
      'yard.example/open',
    ])
      expect(words(after)).toContain(detail);
  });
  it('isolates the complete pricing unit without separating the price from scope or exclusion', () => {
    const document = svg('focal-pottery-price'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const a = before.querySelector('[data-intervention="isolation"]')!,
      b = after.querySelector('[data-intervention="isolation"]')!;
    expect(a.getAttribute('transform')).toBe('translate(65 725)');
    expect(b.getAttribute('transform')).toBe('translate(360 725)');
    expect(normalize(a).isEqualNode(normalize(b))).toBe(true);
    expect([...b.querySelectorAll('text')].map((e) => e.textContent)).toEqual([
      '€24',
      'Price is for mug only.',
      'Saucer sold separately.',
    ]);
    expect(words(after)).toContain('Capacity · 300 ml');
  });
  it('preserves the ticket action exactly and retains the secondary actions as outlined controls', () => {
    const document = svg('focal-booking-action'),
      before = group(document, 'before'),
      after = group(document, 'after');
    expect(
      before
        .querySelector('[data-action="ticket"]')
        ?.isEqualNode(after.querySelector('[data-action="ticket"]')),
    ).toBe(true);
    for (const id of ['calendar', 'directions']) {
      expect(before.querySelector(`[data-element="${id}-surface"]`)?.getAttribute('fill')).toBe(
        '#17352f',
      );
      const surface = after.querySelector(`[data-element="${id}-surface"]`)!;
      expect(surface.getAttribute('fill')).toBe('none');
      expect(surface.getAttribute('stroke')).toBe('#17352f');
      expect(after.querySelector(`[data-element="${id}-label"]`)?.getAttribute('fill')).toBe(
        '#17352f',
      );
    }
    expect(words(after)).toContain('Download ticket Add to calendar Get directions');
    expect(words(after)).toContain('Clay workshop · Sat 18 May');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

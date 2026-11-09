// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'levels-clay-course',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    intervention: 'size',
    count: 4,
  },
  {
    name: 'levels-booking-roles',
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    intervention: 'role-style',
    count: 3,
  },
  {
    name: 'levels-day-pass-terms',
    photo: 'audience-workspace-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    intervention: 'priority-style',
    count: 2,
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
      if (target.getAttribute('data-intervention') === 'size')
        target.setAttribute('font-size', '30');
      else {
        target.setAttribute('font-weight', 'shared-weight-placeholder');
        target.setAttribute('fill', 'shared-paint-placeholder');
      }
    }
  return copy;
};
const words = (node: Element) =>
  [...node.querySelectorAll('text')].map((e) => e.textContent).join(' ');
const styles = (node: Element) =>
  ['font-family', 'font-size', 'font-weight', 'fill'].map((a) => node.getAttribute(a));
const luminance = (hex: string) => {
  const c = hex
    .match(/[a-f\d]{2}/gi)!
    .map((n) => parseInt(n, 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

describe('Differentiate Levels of Importance photographic comparisons', () => {
  it.each(examples)('$name changes only its declared sizes or weight/tone roles', (example) => {
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
  it('assigns seven course lines to lead, practical and reference sizes without changing any other attribute', () => {
    const document = svg('levels-clay-course'),
      before = group(document, 'before'),
      after = group(document, 'after');
    expect(before.querySelectorAll('[data-level]')).toHaveLength(7);
    expect(
      [...before.querySelectorAll('[data-level]')].every(
        (e) => e.getAttribute('font-size') === '30',
      ),
    ).toBe(true);
    for (const [level, size, count] of [
      ['lead', '64', 2],
      ['practical', '30', 3],
      ['reference', '22', 2],
    ] as const) {
      const lines = after.querySelectorAll(`[data-level="${level}"]`);
      expect(lines).toHaveLength(count);
      expect([...lines].every((e) => e.getAttribute('font-size') === size)).toBe(true);
    }
    for (const detail of [
      'Sat 14 Nov · 10:00–12:00',
      '€24 · Book by 7 Nov',
      'Yard Studios · 8 Mill Lane',
      'Autumn program · Session 3',
      'Hosted by Yard Makers',
    ])
      expect(words(after)).toContain(detail);
  });
  it('matches repeated role treatments while preserving both complete records and the first card exactly', () => {
    const document = svg('levels-booking-roles'),
      before = group(document, 'before'),
      after = group(document, 'after');
    expect(
      before
        .querySelector('[data-record="clay"]')
        ?.isEqualNode(after.querySelector('[data-record="clay"]')),
    ).toBe(true);
    const first = after.querySelector('[data-record="clay"]')!,
      second = after.querySelector('[data-record="print"]')!;
    for (const role of ['name', 'date', 'reference'])
      expect(styles(first.querySelector(`[data-role="${role}"]`)!)).toEqual(
        styles(second.querySelector(`[data-role="${role}"]`)!),
      );
    expect([...second.querySelectorAll('text')].map((e) => e.textContent)).toEqual([
      'Print workshop',
      'Sun 15 Nov · 14:00',
      'Reference · YD1186',
    ]);
    expect([...first.querySelectorAll('text')].map((e) => e.textContent)).toEqual([
      'Clay workshop',
      'Sat 14 Nov · 10:00',
      'Reference · YD1042',
    ]);
    expect(
      [...after.querySelectorAll('[data-role]')].every((e) => e.getAttribute('font-size') === '20'),
    ).toBe(true);
  });
  it('promotes the weekday condition above the slogan without altering the price or making the slogan faint', () => {
    const document = svg('levels-day-pass-terms'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const condition = after.querySelector('[data-element="condition"]')!,
      slogan = after.querySelector('[data-element="slogan"]')!;
    expect(condition.textContent).toBe('Weekdays only · 09:00–17:00');
    expect(condition.getAttribute('font-weight')).toBe('700');
    expect(condition.getAttribute('fill')).toBe('#17352f');
    expect(slogan.getAttribute('font-weight')).toBe('400');
    expect(slogan.getAttribute('fill')).toBe('#56665c');
    const background = after.querySelector('[data-element="terms-panel"]')!.getAttribute('fill')!;
    const pairRatio =
      (luminance(background) + 0.05) / (luminance(slogan.getAttribute('fill')!) + 0.05);
    expect(pairRatio).toBeGreaterThan(4.5);
    expect(
      before
        .querySelector('[data-element="price"]')
        ?.isEqualNode(after.querySelector('[data-element="price"]')),
    ).toBe(true);
    expect(after.querySelector('[data-element="price"]')?.textContent).toBe('€18');
    expect(words(after)).toContain('Wi-Fi · Shared desk · Tea & coffee');
    expect(words(after)).toContain('yard.example/daypass');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

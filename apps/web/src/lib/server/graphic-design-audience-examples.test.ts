// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'audience-pottery-poster',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    changes: 4,
  },
  {
    name: 'audience-museum-sign',
    photo: 'audience-museum-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    changes: 4,
  },
  {
    name: 'audience-day-pass-phone',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    changes: 5,
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
const normalize = (node: Element, adaptations = false) => {
  const result = node.cloneNode(true) as Element;
  result.removeAttribute('data-variant');
  result.removeAttribute('transform');
  if (adaptations)
    for (const element of result.querySelectorAll('[data-adapt]')) {
      for (const change of element.getAttribute('data-adapt')!.split(' ')) {
        if (change === 'text') element.textContent = 'Shared text placeholder';
        else element.removeAttribute(change);
      }
    }
  return result;
};
const content = (node: Element) =>
  [...node.querySelectorAll('text')].map((t) => t.textContent).join(' ');

describe('Design for the Audience photographic examples', () => {
  it.each(examples)('$name changes only declared audience adaptations', (example) => {
    const document = svg(example.name);
    const before = group(document, 'before');
    const after = group(document, 'after');
    expect(before.querySelectorAll('[data-adapt]')).toHaveLength(example.changes);
    expect(after.querySelectorAll('[data-adapt]')).toHaveLength(example.changes);
    expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
    expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
    for (const element of after.querySelectorAll('[data-adapt]')) {
      expect(element.tagName).toBe('text');
      expect(element.getAttribute('data-adapt')).toBe(
        example.name === 'audience-museum-sign' ? 'text font-size y' : 'text',
      );
    }
  });

  it.each(examples)('$name shares exact source bytes and mobile content', (example) => {
    const wide = svg(example.name);
    const mobile = svg(`${example.name}-mobile`);
    for (const [id, file] of [
      ['photo', example.photo],
      ['stage', example.stage],
    ]) {
      expect(wide.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
        `data:image/jpeg;base64,${readFileSync(resolve(assets, file)).toString('base64')}`,
      );
    }
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    for (const variant of ['before', 'after']) {
      expect(normalize(group(wide, variant)).isEqualNode(normalize(group(mobile, variant)))).toBe(
        true,
      );
      expect(
        group(wide, variant).querySelector('[data-element="photograph"] use')?.getAttribute('href'),
      ).toBe('#photo');
      expect(
        group(wide, variant).querySelector('[data-element="stage"]')?.getAttribute('href'),
      ).toBe('#stage');
    }
  });

  it('keeps practical workshop facts and both museum routes', () => {
    for (const variant of ['before', 'after']) {
      const pottery = content(group(svg('audience-pottery-poster'), variant));
      for (const fact of [
        '€28',
        'SAT 18 MAY',
        '14:00–16:00',
        'Clay and tools included',
        'No experience needed',
        'Firing included',
      ])
        expect(pottery).toContain(fact);
      const museum = content(group(svg('audience-museum-sign'), variant)).toLowerCase();
      for (const fact of [
        'tickets',
        'information',
        'ground-floor desk',
        'collection',
        'upstairs',
        'lift',
        'beside',
      ])
        expect(museum).toContain(fact);
    }
  });

  it('redistributes all booking facts without implying meeting-room inclusion or availability', () => {
    const document = svg('audience-day-pass-phone');
    for (const variant of ['before', 'after']) {
      const text = content(group(document, variant));
      for (const fact of [
        '24 desks',
        '2 floors',
        '3 meeting rooms',
        'Wi-Fi included',
        'Day pass €18',
        'Mon–Fri',
        '09:00–18:00',
        'Desk',
        'included',
        'Meeting rooms booked separately',
        'Check available desks',
      ])
        expect(text).toContain(fact);
    }
    expect(group(document, 'after').querySelector('[data-element="primary-1"]')?.textContent).toBe(
      'Day pass €18',
    );
    expect(
      group(document, 'after').querySelector('[data-element="secondary-1"]')?.textContent,
    ).toBe('24 desks · 2 floors');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

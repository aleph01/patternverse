// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'guide-maker-gaze',
    photo: 'guide-maker-portrait.jpg',
    stage: 'scale-print-stage-v2.jpg',
    changes: { 'portrait-orientation': ['transform'] },
  },
  {
    name: 'guide-repair-detail',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    changes: { 'leader-halo': ['d'], 'leader-line': ['d'], 'leader-end': ['cx', 'cy'] },
  },
  {
    name: 'guide-booking-arrow',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    changes: { 'arrow-shaft': ['d'], 'arrow-head': ['d'] },
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
const group = (document: Document, name: string) =>
  document.querySelector(`[data-variant="${name}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
describe('Guide the Eye controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only declared directional cue attributes',
    ({ name, changes }) => {
      const document = svg(name),
        before = normalized(group(document, 'before')),
        after = normalized(group(document, 'after'));
      expect(before.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
      expect(after.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
      for (const [id, attributes] of Object.entries(changes)) {
        const a = before.querySelector(`[data-element="${id}"]`)!,
          b = after.querySelector(`[data-element="${id}"]`)!;
        expect(a).not.toBeNull();
        expect(b).not.toBeNull();
        expect(a.getAttribute('data-change')?.split(' ')).toEqual(attributes);
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
    '$name embeds the exact shared local photo and presentation source',
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
  it.each(examples)('$name preserves both complete variants in the narrow version', ({ name }) => {
    const wide = svg(name),
      narrow = svg(name + '-mobile');
    for (const variant of ['before', 'after'])
      expect(normalized(group(wide, variant)).isEqualNode(normalized(group(narrow, variant)))).toBe(
        true,
      );
    expect(wide.querySelector('defs')?.isEqualNode(narrow.querySelector('defs'))).toBe(true);
  });
  it('directs the revised cues toward the declared content without reflecting typography', () => {
    const portrait = svg('guide-maker-gaze');
    expect(
      group(portrait, 'before')
        .querySelector('[data-element="portrait-orientation"]')
        ?.getAttribute('transform'),
    ).toBe('matrix(-1 0 0 1 1024 0)');
    expect(
      group(portrait, 'after')
        .querySelector('[data-element="portrait-orientation"]')
        ?.getAttribute('transform'),
    ).toBe('matrix(1 0 0 1 0 0)');
    expect(
      group(portrait, 'after').querySelector('[data-element="invitation-1"]')?.getAttribute('x'),
    ).toBe('335');
    const detail = group(svg('guide-repair-detail'), 'after').querySelector(
      '[data-element="leader-end"]',
    )!;
    expect(detail.getAttribute('cx')).toBe('234');
    expect(detail.getAttribute('cy')).toBe('506');
    const booking = group(svg('guide-booking-arrow'), 'after');
    expect(booking.querySelector('[data-element="arrow-shaft"]')?.getAttribute('d')).toBe(
      'M158 608H305V674',
    );
    const button = booking.querySelector('[data-element="booking-button"]')!;
    expect(Number(button.getAttribute('y'))).toBeGreaterThan(674);
    expect(305).toBeGreaterThan(Number(button.getAttribute('x')));
    expect(305).toBeLessThan(
      Number(button.getAttribute('x')) + Number(button.getAttribute('width')),
    );
    expect(booking.querySelector('[data-element="booking-label"]')?.textContent).toBe(
      'Reserve a place',
    );
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

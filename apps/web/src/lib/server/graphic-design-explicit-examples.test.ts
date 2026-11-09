// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'explicit-hire-enquiry',
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    replacements: ['button-label'],
    additions: ['consequence'],
  },
  {
    name: 'explicit-completion-report',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    replacements: ['definition'],
    additions: ['denominator'],
  },
  {
    name: 'explicit-tableware-card',
    photo: 'explicit-tableware-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    replacements: [],
    additions: ['inclusion', 'exclusion'],
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
const normalize = (node: Element, clarifications = false) => {
  const copy = node.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (clarifications) {
    for (const addition of copy.querySelectorAll('[data-explicit="add"]')) addition.remove();
    for (const replacement of copy.querySelectorAll('[data-explicit="replace"]'))
      replacement.textContent = 'Shared wording placeholder';
  }
  return copy;
};
const words = (node: Element) =>
  [...node.querySelectorAll('text')].map((t) => t.textContent).join(' ');

describe('Make Meaning Explicit photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared text and preserves all other elements',
    (example) => {
      const document = svg(example.name),
        before = group(document, 'before'),
        after = group(document, 'after');
      const ids = (node: Element, kind: string) =>
        [...node.querySelectorAll(`[data-explicit="${kind}"]`)].map((e) =>
          e.getAttribute('data-element'),
        );
      expect(ids(before, 'replace')).toEqual(example.replacements);
      expect(ids(after, 'replace')).toEqual(example.replacements);
      expect(ids(before, 'add')).toEqual([]);
      expect(ids(after, 'add')).toEqual(example.additions);
      expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
      expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
      for (const changed of after.querySelectorAll('[data-explicit]'))
        expect(changed.tagName).toBe('text');
    },
  );

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

  it('distinguishes sending an enquiry from confirming the booking while retaining the request', () => {
    const document = svg('explicit-hire-enquiry'),
      after = group(document, 'after');
    expect(after.querySelector('[data-element="button-label"]')?.textContent).toBe(
      'Send hire enquiry',
    );
    expect(after.querySelector('[data-element="consequence"]')?.textContent).toBe(
      'Booking is confirmed separately.',
    );
    for (const fact of [
      'Sat 18 May · 14:00–16:00',
      'Clay workshop · 8 people',
      'Name: Alex Morgan',
      'Email: alex@example.com',
      'We reply within 2 working days.',
    ])
      expect(words(after)).toContain(fact);
    expect(
      group(document, 'before').querySelector('[data-element="button-label"]')?.textContent,
    ).toBe('Continue');
  });

  it('defines the attendance measure and denominator without changing the displayed percentage', () => {
    const after = group(svg('explicit-completion-report'), 'after');
    const counts = after
      .querySelector('[data-element="denominator"]')!
      .textContent!.match(/\d+/g)!
      .map(Number);
    const percentage = Number(
      after.querySelector('[data-element="figure"]')!.textContent!.replace('%', ''),
    );
    expect((counts[0] / counts[1]) * 100).toBe(percentage);
    expect(after.querySelector('[data-element="definition"]')?.textContent).toBe(
      'Attended all 4 sessions',
    );
    expect(words(after)).toContain('Spring 2026 · Four-session course');
    expect(words(after)).toContain('No assessment or skill rating recorded');
  });

  it('states the priced item and separate accessory without changing the price or material', () => {
    const after = group(svg('explicit-tableware-card'), 'after');
    expect(after.querySelector('[data-element="inclusion"]')?.textContent).toBe(
      'Price is for the mug only.',
    );
    expect(after.querySelector('[data-element="exclusion"]')?.textContent).toBe(
      'Saucer sold separately.',
    );
    expect(after.querySelector('[data-element="price"]')?.textContent).toBe('€24');
    expect(words(after)).toContain('Handmade stoneware');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

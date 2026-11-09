// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'remove-cinema-poster',
    photo: 'remove-courtyard-cinema-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    removed: ['repeated-admission'],
  },
  {
    name: 'remove-coffee-package',
    photo: 'core-message-coffee-photo.jpg',
    stage: 'core-message-coffee-package-stage.jpg',
    removed: ['ornamental-border', 'care-seal'],
  },
  {
    name: 'remove-dispatch-report',
    photo: 'scale-delivery-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
    removed: ['off-task-update'],
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
const normalize = (node: Element, remove = false) => {
  const copy = node.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (remove) for (const element of copy.querySelectorAll('[data-remove]')) element.remove();
  return copy;
};
const words = (node: Element) =>
  [...node.querySelectorAll('text')].map((t) => t.textContent).join(' ');

describe('Remove the Nonessential photographic comparisons', () => {
  it.each(examples)(
    '$name deletes exactly the declared elements and preserves every retained element',
    (example) => {
      const document = svg(example.name),
        before = group(document, 'before'),
        after = group(document, 'after');
      expect(
        [...before.querySelectorAll('[data-remove]')].map((e) => e.getAttribute('data-remove')),
      ).toEqual(example.removed);
      expect(after.querySelectorAll('[data-remove]')).toHaveLength(0);
      expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
      expect(normalize(before, true).isEqualNode(normalize(after))).toBe(true);
    },
  );

  it.each(examples)(
    '$name shares exact source bytes and identical content in its mobile version',
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
      for (const variant of ['before', 'after']) {
        expect(normalize(group(wide, variant)).isEqualNode(normalize(group(mobile, variant)))).toBe(
          true,
        );
        expect(
          group(wide, variant)
            .querySelector('[data-element="photograph"] use')
            ?.getAttribute('href'),
        ).toBe('#photo');
      }
    },
  );

  it('keeps admission and practical event conditions after removing the duplicate badge', () => {
    const content = words(group(svg('remove-cinema-poster'), 'after'));
    for (const fact of [
      'Free courtyard',
      'FRI 21 JUN',
      'Gates 20:30',
      'Film starts 21:30',
      'Bring a chair',
      '8 Mill Yard',
      'No booking',
      'Cancelled in rain',
      'riveryard.example',
    ])
      expect(content).toContain(fact);
    expect(content).not.toContain('ENTRY');
  });

  it('retains product identity, quantity and qualification while removing only ornament', () => {
    const content = words(group(svg('remove-coffee-package'), 'after'));
    for (const fact of [
      'NORTH ROAST',
      'Decaf.',
      'Whole bean.',
      'Chocolate & toasted nuts.',
      'Medium roast · 250 g',
      'Decaffeinated, not caffeine-free.',
    ])
      expect(content).toContain(fact);
    expect(content).not.toContain('WITH CARE');
  });

  it('retains the unfavorable dispatch count, denominator and time definition', () => {
    const after = group(svg('remove-dispatch-report'), 'after');
    expect(after.querySelector('[data-element="total"]')?.textContent).toBe('184 / 200');
    expect(after.querySelector('[data-element="exception"]')?.textContent).toBe(
      '16 orders exceeded 2 working days',
    );
    expect(after.querySelector('[data-element="definition"]')?.textContent).toBe(
      'Clock starts at payment · May orders',
    );
    const [within, total] = after
      .querySelector('[data-element="total"]')!
      .textContent!.split('/')
      .map(Number);
    const exceptions = Number(
      after.querySelector('[data-element="exception"]')!.textContent!.match(/^\d+/)![0],
    );
    expect(within + exceptions).toBe(total);
    expect(words(after)).not.toContain('COMMUNITY UPDATE');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

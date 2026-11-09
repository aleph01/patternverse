// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'contrast-evening-details',
    photo: 'chunk-garden-supper-photo.jpg',
    intervention: 'text-paint',
    count: 4,
  },
  {
    name: 'contrast-session-series',
    photo: 'audience-pottery-photo.jpg',
    intervention: 'series-pattern',
    count: 2,
  },
  {
    name: 'contrast-interview-voices',
    photo: 'core-message-repair-photo.jpg',
    intervention: 'type-role',
    count: 3,
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
        case 'text-paint':
          target.setAttribute('fill', 'shared-paint-placeholder');
          break;
        case 'series-pattern':
          target.setAttribute('stroke-dasharray', 'none');
          break;
        case 'type-role':
          target.setAttribute('font-family', 'Arial, Helvetica, sans-serif');
          target.setAttribute('font-style', 'normal');
          break;
      }
    }
  return copy;
};
const luminance = (hex: string) => {
  const c = hex
    .match(/[a-f\d]{2}/gi)!
    .map((n) => parseInt(n, 16) / 255)
    .map((n) => (n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a: string, b: string) => {
  const x = luminance(a),
    y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const words = (node: Element) =>
  [...node.querySelectorAll('text')].map((e) => e.textContent).join(' ');

describe('Create Deliberate Contrast photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared paint, stroke pattern or typographic role',
    (example) => {
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
    },
  );
  it.each(examples)(
    '$name embeds exact shared photographic bytes and identical mobile content',
    (example) => {
      const wide = svg(example.name),
        mobile = svg(`${example.name}-mobile`);
      for (const [id, file] of [
        ['photo', example.photo],
        ['stage', 'scale-print-stage-v2.jpg'],
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
  it('increases the specified text-background color ratio without changing the practical facts', () => {
    const document = svg('contrast-evening-details'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const bg = after.querySelector('[data-element="details-panel"]')!.getAttribute('fill')!;
    expect(bg).toBe('#f4f1e8');
    for (const id of ['date', 'venue', 'cost', 'booking']) {
      const a = before.querySelector(`[data-element="${id}"]`)!,
        b = after.querySelector(`[data-element="${id}"]`)!;
      expect(ratio(a.getAttribute('fill')!, bg)).toBeCloseTo(2.43956, 4);
      expect(ratio(b.getAttribute('fill')!, bg)).toBeCloseTo(11.7185, 4);
      expect(a.textContent).toBe(b.textContent);
    }
    expect(words(after)).toContain('€12 per person · Book by 10 June');
  });
  it('gives Evening and its legend matching dashes while retaining correct data geometry for both peers', () => {
    const document = svg('contrast-session-series'),
      before = group(document, 'before'),
      after = group(document, 'after');
    for (const id of ['evening-line', 'evening-legend']) {
      expect(before.querySelector(`[data-element="${id}"]`)?.getAttribute('stroke-dasharray')).toBe(
        'none',
      );
      expect(after.querySelector(`[data-element="${id}"]`)?.getAttribute('stroke-dasharray')).toBe(
        '10 7',
      );
    }
    for (const [id, values] of [
      ['morning', [12, 28, 24, 36]],
      ['evening', [28, 16, 32, 24]],
    ] as const) {
      const series = after.querySelector(`[data-series="${id}"]`)!;
      expect(series.getAttribute('data-values')).toBe(values.join(','));
      const path = values
        .map((v, i) => `${i ? 'L' : 'M'}${110 + i * 140} ${740 - v * 3.875}`)
        .join('');
      expect(series.querySelector(`[data-element="${id}-line"]`)?.getAttribute('d')).toBe(path);
      expect(after.querySelector(`[data-element="${id}-values"]`)?.textContent).toContain(
        values.join(' / '),
      );
    }
    expect(
      before
        .querySelector('[data-series="morning"]')
        ?.isEqualNode(after.querySelector('[data-series="morning"]')),
    ).toBe(true);
  });
  it('distinguishes response typography without rewriting or restyling the question, labels or attribution', () => {
    const document = svg('contrast-interview-voices'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const originals = [...before.querySelectorAll('[data-intervention="type-role"]')],
      revisions = [...after.querySelectorAll('[data-intervention="type-role"]')];
    expect(originals.map((e) => e.textContent)).toEqual(revisions.map((e) => e.textContent));
    for (const line of revisions) {
      expect(line.getAttribute('font-family')).toBe('Georgia, Times New Roman, serif');
      expect(line.getAttribute('font-style')).toBe('italic');
      expect(line.getAttribute('font-size')).toBe('22');
      expect(line.getAttribute('font-weight')).toBe('400');
    }
    for (const id of ['question-role', 'question', 'response-role', 'attribution'])
      expect(
        before
          .querySelector(`[data-element="${id}"]`)
          ?.isEqualNode(after.querySelector(`[data-element="${id}"]`)),
      ).toBe(true);
    expect(words(after)).toContain('Sam Rivers · Fictional repair volunteer');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

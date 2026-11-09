// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  { name: 'form-seed-procedure', photo: 'form-seed-packing-photo.jpg' },
  { name: 'form-pass-comparison', photo: 'audience-workspace-photo.jpg' },
  { name: 'form-open-studios-tabs', photo: 'form-open-studios-photo.jpg' },
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
const normalize = (node: Element, removeForm = false) => {
  const copy = node.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (removeForm) copy.querySelector('[data-intervention="body-form"]')!.replaceChildren();
  return copy;
};
const body = (node: Element) => node.querySelector('[data-intervention="body-form"]')!;
const words = (node: Element) =>
  [...node.querySelectorAll('text')]
    .map((t) => t.textContent)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();

describe('Match Form to Purpose photographic comparisons', () => {
  it.each(examples)('$name changes only the declared form region', (example) => {
    const document = svg(example.name);
    const before = group(document, 'before'),
      after = group(document, 'after');
    expect(before.querySelectorAll('[data-intervention]')).toHaveLength(1);
    expect(after.querySelectorAll('[data-intervention]')).toHaveLength(1);
    expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
    expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
    expect(
      [...before.querySelectorAll('text')]
        .filter((t) => !t.closest('[data-intervention]'))
        .map((t) => t.textContent),
    ).toEqual(
      [...after.querySelectorAll('text')]
        .filter((t) => !t.closest('[data-intervention]'))
        .map((t) => t.textContent),
    );
  });

  it.each(examples)(
    '$name embeds identical photographic sources and preserves mobile content',
    (example) => {
      const wide = svg(example.name),
        mobile = svg(`${example.name}-mobile`);
      for (const [id, file] of [
        ['photo', example.photo],
        ['stage', 'scale-print-stage-v2.jpg'],
      ]) {
        expect(wide.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          `data:image/jpeg;base64,${readFileSync(resolve(assets, file)).toString('base64')}`,
        );
      }
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
      for (const variant of ['before', 'after'])
        expect(normalize(group(wide, variant)).isEqualNode(normalize(group(mobile, variant)))).toBe(
          true,
        );
    },
  );

  it('preserves every instruction word and its order instead of rewriting the procedure', () => {
    const document = svg('form-seed-procedure');
    const before = body(group(document, 'before'));
    const after = body(group(document, 'after'));
    const steps = [...after.querySelectorAll('[data-step]')];
    expect(steps).toHaveLength(3);
    expect(steps.map(words).join(' ')).toBe(words(before));
    for (const step of steps) {
      expect(words(step)).toBe(step.getAttribute('aria-label'));
      for (const text of step.querySelectorAll('text'))
        expect(text.getAttribute('font-size')).toBe('24');
    }
    expect(words(before)).toContain('Add 20 dry seeds');
  });

  it('keeps pass facts associated with the correct columns and retains qualifications', () => {
    const document = svg('form-pass-comparison');
    const after = body(group(document, 'after'));
    expect(
      [...after.querySelectorAll('[data-row]')].map((row) =>
        [...row.querySelectorAll('text')].map((t) => t.textContent),
      ),
    ).toEqual([
      ['Price', '€18', '€75'],
      ['Visits', '1', '5'],
      ['Valid for', 'Booked day', '30 days'],
    ]);
    for (const variant of ['before', 'after']) {
      const content = words(group(document, variant));
      for (const fact of [
        '€18',
        '€75',
        '30 days',
        '30-day period starts with first visit',
        'Weekdays · 09:00–18:00',
        'Desk and Wi-Fi included · Rooms separate',
      ])
        expect(content).toContain(fact);
    }
  });

  it('gives every tab its own address and event context without representing an actual cut', () => {
    const document = svg('form-open-studios-tabs');
    const address = words(body(group(document, 'before')));
    const after = body(group(document, 'after'));
    const tabs = [...after.querySelectorAll('[data-tab]')];
    expect(tabs).toHaveLength(5);
    for (const tab of tabs) {
      expect(words(tab)).toContain(address);
      expect(words(tab)).toContain('Open studios · 18 May');
    }
    expect(after.querySelectorAll('[data-cut-guide="vertical"]')).toHaveLength(4);
    expect(document.querySelector('desc')?.textContent).toContain('before cutting');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

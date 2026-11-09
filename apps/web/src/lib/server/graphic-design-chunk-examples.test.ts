// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'chunk-supper-invitation',
    photo: 'chunk-garden-supper-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
  },
  {
    name: 'chunk-booking-records',
    photo: 'form-open-studios-photo.jpg',
    stage: 'audience-phone-stage.jpg',
  },
  {
    name: 'chunk-collection-reference',
    photo: 'scale-delivery-photo-v2.jpg',
    stage: 'scale-print-stage-v2.jpg',
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
const normalize = (node: Element, removeIntervention = false) => {
  const copy = node.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (removeIntervention) copy.querySelector('[data-intervention]')!.replaceChildren();
  return copy;
};
const unchangedExceptY = (before: Element, after: Element, ids: string[]) => {
  for (const id of ids) {
    const a = before.querySelector(`[data-element="${id}"]`)!.cloneNode(true) as Element;
    const b = after.querySelector(`[data-element="${id}"]`)!.cloneNode(true) as Element;
    a.removeAttribute('y');
    b.removeAttribute('y');
    expect(a.isEqualNode(b), id).toBe(true);
  }
};

describe('Chunk Information photographic comparisons', () => {
  it.each(examples)('$name preserves everything outside the declared intervention', ({ name }) => {
    const document = svg(name),
      before = group(document, 'before'),
      after = group(document, 'after');
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

  it('retains every supper fact in order and groups facts by practical questions', () => {
    const document = svg('chunk-supper-invitation'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const ids = Array.from({ length: 6 }, (_, i) => `fact-${i}`);
    unchangedExceptY(before, after, ids);
    expect(
      [...after.querySelectorAll('[data-element^="fact-"]')].map((e) =>
        e.getAttribute('data-element'),
      ),
    ).toEqual(ids);
    const chunks = [...after.querySelectorAll('[data-chunk]')];
    expect(chunks.map((e) => e.getAttribute('data-chunk'))).toEqual([
      'when-where',
      'cost-booking',
      'on-day',
    ]);
    expect(
      chunks.map((e) =>
        [...e.querySelectorAll('[data-element^="fact-"]')].map((t) =>
          t.getAttribute('data-element'),
        ),
      ),
    ).toEqual([
      ['fact-0', 'fact-1'],
      ['fact-2', 'fact-3'],
      ['fact-4', 'fact-5'],
    ]);
    expect(after.querySelectorAll('[data-element^="heading-"]')).toHaveLength(3);
  });

  it('keeps each workshop with its own date and place count without restyling any value', () => {
    const document = svg('chunk-booking-records'),
      before = group(document, 'before'),
      after = group(document, 'after');
    unchangedExceptY(before, after, [
      'clay-name',
      'clay-date',
      'clay-places',
      'print-name',
      'print-date',
      'print-places',
    ]);
    expect(before.querySelectorAll('[data-element^="field-"]')).toHaveLength(3);
    expect(after.querySelectorAll('[data-element^="field-"]')).toHaveLength(0);
    expect(after.querySelectorAll('[data-record]')).toHaveLength(2);
    for (const [id, values] of [
      ['clay', ['Clay workshop', 'Sat 18 May · 10:00', '1 place']],
      ['print', ['Print workshop', 'Sun 19 May · 14:00', '2 places']],
    ] as const) {
      const record = after.querySelector(`[data-record="${id}"]`)!;
      expect([...record.querySelectorAll('text')].map((e) => e.textContent)).toEqual(values);
      expect(record.querySelectorAll('[data-boundary="record"]')).toHaveLength(1);
    }
  });

  it('adds only two reference separators while preserving the canonical identifier and all styling', () => {
    const document = svg('chunk-collection-reference'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const a = before.querySelector('[data-element="reference"]')!.cloneNode(true) as Element;
    const b = after.querySelector('[data-element="reference"]')!.cloneNode(true) as Element;
    expect(a.textContent).toBe('BX7319064285');
    expect(b.textContent).toBe('BX73 1906 4285');
    expect(b.textContent!.replaceAll(' ', '')).toBe(a.textContent);
    b.textContent = a.textContent;
    expect(a.isEqualNode(b)).toBe(true);
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

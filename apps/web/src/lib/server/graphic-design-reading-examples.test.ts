// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'reading-seed-procedure',
    photo: 'form-seed-packing-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    intervention: 'step-number',
    beforeCount: 0,
    afterCount: 4,
  },
  {
    name: 'reading-editorial-thread',
    photo: 'core-message-repair-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    intervention: 'continuation-position',
    beforeCount: 1,
    afterCount: 1,
  },
  {
    name: 'reading-visit-preparation',
    photo: 'audience-pottery-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    intervention: 'mobile-position',
    beforeCount: 2,
    afterCount: 2,
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
      if (target.getAttribute('data-intervention') === 'step-number') target.remove();
      else target.setAttribute('transform', 'shared-position-placeholder');
    }
  return copy;
};
const sourceOrder = (node: Element) =>
  [...node.querySelectorAll('[data-step]')].map((e) => Number(e.getAttribute('data-step')));
const visualSteps = (node: Element) =>
  [...node.querySelectorAll('[data-step]')]
    .sort(
      (a, b) =>
        Number(a.getAttribute('transform')!.match(/ (\d+)\)/)![1]) -
        Number(b.getAttribute('transform')!.match(/ (\d+)\)/)![1]),
    )
    .map((e) => Number(e.getAttribute('data-step')));

describe('Establish a Clear Reading Order photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared additions or intact group positions',
    (example) => {
      const document = svg(example.name),
        before = group(document, 'before'),
        after = group(document, 'after');
      expect(before.querySelectorAll('[data-intervention]')).toHaveLength(example.beforeCount);
      expect(after.querySelectorAll('[data-intervention]')).toHaveLength(example.afterCount);
      expect(
        [...after.querySelectorAll('[data-intervention]')].every(
          (e) => e.getAttribute('data-intervention') === example.intervention,
        ),
      ).toBe(true);
      expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
      expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
    },
  );
  it.each(examples)(
    '$name embeds exact shared photographic bytes and identical stacked content',
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
  it('labels an unchanged four-step progression in row order without rewriting the procedure', () => {
    const document = svg('reading-seed-procedure'),
      before = group(document, 'before'),
      after = group(document, 'after');
    expect(sourceOrder(before)).toEqual([1, 2, 3, 4]);
    expect(sourceOrder(after)).toEqual([1, 2, 3, 4]);
    for (const [i, title] of [
      'Fill envelope',
      'Close envelope',
      'Seal envelope',
      'Label envelope',
    ].entries()) {
      const step = after.querySelector(`[data-step="${i + 1}"]`)!;
      expect(step.querySelector('[data-intervention="step-number"]')?.textContent).toBe(
        String(i + 1),
      );
      expect(step.querySelector(`[data-element="step-${i + 1}-title"]`)?.textContent).toBe(title);
    }
    expect(after.querySelector('[data-element="step-1-line-1"]')?.textContent).toBe(
      'Add 20 dry seeds.',
    );
    expect(after.querySelector('[data-element="step-4-line-2"]')?.textContent).toBe(
      'and harvest year.',
    );
  });
  it('moves only the intact continuation beneath its opening while preserving the independent aside', () => {
    const document = svg('reading-editorial-thread'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const opening = after.querySelector('[data-part="opening"]')!,
      a = before.querySelector('[data-part="continuation"]')!,
      b = after.querySelector('[data-part="continuation"]')!;
    expect(a.getAttribute('transform')).toBe('translate(335 735)');
    expect(b.getAttribute('transform')).toBe('translate(65 735)');
    expect(opening.getAttribute('transform')).toBe('translate(65 575)');
    expect(normalize(a).isEqualNode(normalize(b))).toBe(true);
    expect(
      before
        .querySelector('[data-part="aside"]')
        ?.isEqualNode(after.querySelector('[data-part="aside"]')),
    ).toBe(true);
    expect(
      [...after.querySelectorAll('[data-part]')].map((e) => e.getAttribute('data-part')),
    ).toEqual(['opening', 'continuation', 'aside']);
  });
  it('retains logical source order and corrects the narrow visual positions of complete steps', () => {
    const document = svg('reading-visit-preparation'),
      before = group(document, 'before'),
      after = group(document, 'after');
    expect(sourceOrder(before)).toEqual([1, 2, 3]);
    expect(sourceOrder(after)).toEqual([1, 2, 3]);
    expect(visualSteps(before)).toEqual([1, 3, 2]);
    expect(visualSteps(after)).toEqual([1, 2, 3]);
    for (const id of [1, 2, 3])
      expect(
        normalize(before.querySelector(`[data-step="${id}"]`)!).isEqualNode(
          normalize(after.querySelector(`[data-step="${id}"]`)!),
        ),
      ).toBe(true);
    expect(after.querySelector('[data-element="visit-2-line-2"]')?.textContent).toBe(
      'Booking closes 7 Nov',
    );
  });
  it('uses the identical step content and ordered source lists in the responsive HTML proof', () => {
    const source = readFileSync(
      resolve(root, 'docs/pattern-packages/graphic-design-reading-responsive-proof.html'),
      'utf8',
    );
    const document = new DOMParser().parseFromString(source, 'text/html'),
      drawing = svg('reading-visit-preparation');
    for (const variant of ['before', 'after']) {
      const section = document.querySelector(`section[data-variant="${variant}"]`)!;
      expect(sourceOrder(section)).toEqual([1, 2, 3]);
      expect(section.querySelectorAll('ol.steps > li')).toHaveLength(3);
      for (const li of section.querySelectorAll('li')) {
        const id = li.getAttribute('data-step'),
          unit = group(drawing, variant).querySelector(`[data-step="${id}"]`)!;
        expect([...li.querySelectorAll('h3,p')].map((e) => e.textContent)).toEqual(
          [...unit.querySelectorAll('text')].map((e) => e.textContent),
        );
      }
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

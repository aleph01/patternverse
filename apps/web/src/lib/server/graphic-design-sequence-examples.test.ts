// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'sequence-informed-invitation',
    photo: 'chunk-garden-supper-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    before: ['book', 'evening', 'visit'],
    after: ['evening', 'visit', 'book'],
  },
  {
    name: 'sequence-artwork-handoff',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    before: ['approve', 'export', 'upload'],
    after: ['export', 'upload', 'approve'],
  },
  {
    name: 'sequence-service-review',
    photo: 'core-message-library-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    before: ['method', 'finding', 'limits'],
    after: ['finding', 'method', 'limits'],
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
const normalize = (node: Element, removeSequence = false) => {
  const copy = node.cloneNode(true) as Element;
  copy.removeAttribute('data-variant');
  copy.removeAttribute('transform');
  if (removeSequence) copy.querySelector('[data-intervention="sequence"]')!.replaceChildren();
  return copy;
};
const units = (node: Element) => [...node.querySelectorAll('[data-unit]')];
const order = (node: Element) => units(node).map((e) => e.getAttribute('data-unit'));
const text = (node: Element) =>
  [...node.querySelectorAll('text')].map((e) => e.textContent).join(' ');

describe('Sequence the Message photographic comparisons', () => {
  it.each(examples)(
    '$name only reorders three intact units and preserves the rest of the design',
    (example) => {
      const document = svg(example.name),
        before = group(document, 'before'),
        after = group(document, 'after');
      expect(order(before)).toEqual(example.before);
      expect(order(after)).toEqual(example.after);
      expect(normalize(before).isEqualNode(normalize(after))).toBe(false);
      expect(normalize(before, true).isEqualNode(normalize(after, true))).toBe(true);
      expect(units(before).map((e) => e.getAttribute('transform'))).toEqual(
        units(after).map((e) => e.getAttribute('transform')),
      );
      for (const original of units(before)) {
        const revised = after.querySelector(`[data-unit="${original.getAttribute('data-unit')}"]`)!;
        expect(normalize(original).isEqualNode(normalize(revised))).toBe(true);
      }
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
  it('puts the cost, venue and date before the unchanged booking request', () => {
    const after = group(svg('sequence-informed-invitation'), 'after'),
      [evening, visit, book] = units(after);
    expect(text(evening)).toContain('€12 per person');
    expect(text(evening)).toContain('4 Park Lane');
    expect(text(visit)).toContain('Fri 14 June · 18:00–20:00');
    expect(text(book)).toContain('Book by 10 June');
    expect(text(book)).toContain('gardenclub.example/supper');
    expect(text(after)).toContain('Outdoor tables · Indoors if wet');
  });
  it('puts the final PDF before its upload and approval of the emailed proof last', () => {
    const after = group(svg('sequence-artwork-handoff'), 'after'),
      [prepare, submit, approve] = units(after);
    expect(text(prepare)).toContain('Save a PDF of the final design.');
    expect(text(submit)).toContain('Upload the PDF for this order.');
    expect(text(approve)).toContain('Check the emailed proof.');
    expect(text(approve)).toContain('Reply to approve before printing.');
  });
  it('leads with a correct descriptive increase and keeps qualifications and the limits unit intact', () => {
    const document = svg('sequence-service-review'),
      before = group(document, 'before'),
      after = group(document, 'after');
    const finding = after.querySelector('[data-unit="finding"]')!;
    const counts = finding
      .querySelector('[data-element="finding-line-1"]')!
      .textContent!.match(/\d+/g)!
      .map(Number);
    expect(((counts[1] - counts[0]) / counts[0]) * 100).toBe(30);
    expect(text(finding)).toContain('30% more loans · Not unique users');
    const limit = after.querySelector('[data-unit="limits"]')!;
    expect(limit.isEqualNode(before.querySelector('[data-unit="limits"]'))).toBe(true);
    expect(text(limit)).toContain('Cause of increase not established.');
    expect(text(limit)).toContain('No comparison branch was tracked.');
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

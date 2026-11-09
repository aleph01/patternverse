// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

type Example = { name: string; sources: Record<string, string>; changes: Record<string, string[]> };
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const examples: Example[] = [
  {
    name: 'spacing-open-studio-program',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'print-row': ['transform'], 'tour-row': ['transform'] },
  },
  {
    name: 'spacing-workshop-cards',
    sources: {
      photo: 'audience-pottery-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: { 'clay-copy': ['transform'], 'print-copy': ['transform'] },
  },
  {
    name: 'spacing-studio-notes',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'section-one-body': ['transform'], 'section-two-body': ['transform'] },
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
const group = (document: Document, variant: string) =>
  document.querySelector(`[data-variant="${variant}"]`)!;
const part = (element: Element, id: string) => element.querySelector(`[data-element="${id}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
describe('Establish Consistent Spacing controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared positions only', ({ name, changes }) => {
    const document = svg(name),
      before = normalized(group(document, 'before')),
      after = normalized(group(document, 'after'));
    expect(before.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
    expect(after.querySelectorAll('[data-change]')).toHaveLength(Object.keys(changes).length);
    for (const [id, attributes] of Object.entries(changes)) {
      const a = part(before, id),
        b = part(after, id);
      expect(a).not.toBeNull();
      expect(b).not.toBeNull();
      expect(a.getAttribute('data-change')?.split(' ')).toEqual(attributes);
      for (const attribute of attributes) {
        expect(['y', 'transform']).toContain(attribute);
        expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
        a.removeAttribute(attribute);
        b.removeAttribute(attribute);
      }
    }
    expect(before.isEqualNode(after)).toBe(true);
  });
  it.each(examples)(
    '$name embeds the identical local image and paper sources',
    ({ name, sources }) => {
      const document = svg(name);
      for (const [id, file] of Object.entries(sources))
        expect(document.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
        );
    },
  );
  it.each(examples)('$name preserves the complete variants in its stacked view', ({ name }) => {
    const wide = svg(name),
      mobile = svg(name + '-mobile');
    for (const variant of ['before', 'after'])
      expect(normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant)))).toBe(
        true,
      );
    expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
  });
  it('repeats peer intervals, local insets and final-heading-to-body gaps', () => {
    const program = group(svg('spacing-open-studio-program'), 'after');
    const rowY = ['clay-row', 'print-row', 'tour-row'].map((id) =>
      Number(
        part(program, id)
          .getAttribute('transform')!
          .match(/translate\(65 (\d+)\)/)![1],
      ),
    );
    expect(rowY[1] - rowY[0]).toBe(120);
    expect(rowY[2] - rowY[1]).toBe(120);
    const cards = group(svg('spacing-workshop-cards'), 'after');
    for (const id of ['clay-copy', 'print-copy'])
      expect(part(cards, id).getAttribute('transform')).toBe('translate(14 195)');
    const notes = group(svg('spacing-studio-notes'), 'after');
    const headingY = ['section-one-title', 'section-two-title-2'].map((id) =>
      Number(part(notes, id).getAttribute('y')),
    );
    const bodyY = ['section-one-body', 'section-two-body'].map((id) =>
      Number(
        part(notes, id)
          .getAttribute('transform')!
          .match(/translate\(65 (\d+)\)/)![1],
      ),
    );
    expect(bodyY.map((y, i) => y - headingY[i])).toEqual([32, 32]);
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

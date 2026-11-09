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
    name: 'break-grid-open-studio',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { headline: ['transform'] },
  },
  {
    name: 'break-grid-material-study',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'image-module': ['transform'] },
  },
  {
    name: 'break-grid-workshop-booking',
    sources: {
      photo: 'audience-pottery-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: { 'clay-booking': ['transform'] },
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
describe('Break the Grid Deliberately controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared complete-module positions',
    ({ name, changes }) => {
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
          expect(['transform']).toContain(attribute);
          expect(a.getAttribute(attribute)).not.toBe(b.getAttribute(attribute));
          a.removeAttribute(attribute);
          b.removeAttribute(attribute);
        }
      }
      expect(before.isEqualNode(after)).toBe(true);
    },
  );
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
  it('makes bounded exceptions while preserving practical references and the complete module content', () => {
    const poster = svg('break-grid-open-studio');
    expect(part(group(poster, 'after'), 'headline').getAttribute('transform')).toBe(
      'translate(65 0)',
    );
    for (const v of ['before', 'after'])
      expect(part(group(poster, v), 'photograph').getAttribute('x')).toBe('110');
    const study = group(svg('break-grid-material-study'), 'after'),
      module = part(study, 'image-module');
    expect(module.getAttribute('transform')).toBe('translate(191 300)');
    expect(part(module, 'photograph').getAttribute('width')).toBe('228');
    const moduleX = Number(module.getAttribute('transform')!.match(/translate\((\d+)/)![1]),
      moduleWidth = Number(part(module, 'photograph').getAttribute('width'));
    expect(moduleX).toBeLessThan(
      Number(part(study, 'material-title').getAttribute('x')) + moduleWidth,
    );
    expect(moduleX + moduleWidth).toBeGreaterThan(
      Number(part(study, 'process-title').getAttribute('x')),
    );
    const workshops = svg('break-grid-workshop-booking');
    for (const v of ['before', 'after'])
      expect(part(group(workshops, v), 'guest-photograph').getAttribute('x')).toBe('45');
    expect(part(group(workshops, 'after'), 'clay-booking').getAttribute('transform')).toBe(
      'translate(79 690)',
    );
    const workshopAfter = group(workshops, 'after'),
      translateX = (id: string) =>
        Number(
          part(workshopAfter, id)
            .getAttribute('transform')!
            .match(/translate\((\d+)/)![1],
        );
    expect(
      translateX('clay-booking') - Number(part(workshopAfter, 'clay-card').getAttribute('x')),
    ).toBe(
      translateX('print-booking') - Number(part(workshopAfter, 'print-card').getAttribute('x')),
    );
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

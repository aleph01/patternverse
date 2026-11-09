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
    name: 'typeface-reading-cut',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'selected-type': ['font-family'] },
  },
  {
    name: 'typeface-event-tone',
    sources: { photo: 'chunk-garden-supper-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'selected-type': ['font-family'] },
  },
  {
    name: 'typeface-reference-code',
    sources: { photo: 'audience-pottery-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'selected-type': ['font-family'] },
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
describe('Match Typeface to Context controlled photographic comparisons', () => {
  it.each(examples)('$name changes only its declared font selection', ({ name, changes }) => {
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
        expect(['font-family']).toContain(attribute);
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
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
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
  it('embeds exact licensed instances, selects the intended cuts and faces, and preserves copy and nominal type sizes', () => {
    const families: Record<string, string> = {
      PVReadingDisplay: 'reading-display.woff2',
      PVReadingText: 'reading-text.woff2',
      PVGeometric: 'geometric.woff2',
      PVEvent: 'event.woff2',
      PVCode: 'code.woff2',
    };
    const choices = [
      ['typeface-reading-cut', 'PVReadingDisplay', 'PVReadingText'],
      ['typeface-event-tone', 'PVGeometric', 'PVEvent'],
      ['typeface-reference-code', 'PVGeometric', 'PVCode'],
    ];
    for (const [name, beforeFamily, afterFamily] of choices) {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(part(before, 'selected-type').getAttribute('font-family')).toBe(beforeFamily);
      expect(part(after, 'selected-type').getAttribute('font-family')).toBe(afterFamily);
      expect(before.textContent).toBe(after.textContent);
      const style = doc.querySelector('defs style')!.textContent!;
      for (const [family, file] of Object.entries(families)) {
        expect(style).toContain(
          'font-family:' +
            family +
            ';src:url(data:font/woff2;base64,' +
            readFileSync(
              resolve(root, 'docs/pattern-packages/graphic-design-typeface-fonts', file),
            ).toString('base64'),
        );
      }
    }
    const code = svg('typeface-reference-code');
    for (const variant of ['before', 'after']) {
      const reference = part(group(code, variant), 'reference');
      expect(reference.textContent).toBe('Il1O0-27');
      expect(reference.getAttribute('font-size')).toBe('48');
      expect(reference.getAttribute('font-weight')).toBe('400');
    }
    const instances = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-typeface-fonts/instances.json'),
        'utf8',
      ),
    ) as { file: string; source: string; axes: Record<string, number> }[];
    const display = instances.find((f) => f.file === 'reading-display.woff2')!,
      text = instances.find((f) => f.file === 'reading-text.woff2')!;
    expect(display.source).toBe(text.source);
    expect(display.axes).toEqual({ wght: 400, opsz: 60 });
    expect(text.axes).toEqual({ wght: 400, opsz: 12 });
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

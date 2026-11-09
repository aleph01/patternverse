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
    name: 'rhythm-studio-diary',
    sources: {
      photo: 'audience-pottery-photo.jpg',
      photo2: 'scale-workshop-photo-v2.jpg',
      photo3: 'form-open-studios-photo.jpg',
      photo4: 'explicit-tableware-photo.jpg',
      stage: 'scale-print-stage-v2.jpg',
    },
    changes: {
      'workspace-photograph': ['x'],
      'workspace-copy': ['transform'],
      'studio-photograph': ['x'],
      'studio-copy': ['transform'],
      'objects-photograph': ['x'],
      'objects-copy': ['transform'],
    },
  },
  {
    name: 'rhythm-open-studio-program',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'afternoon-block': ['transform'] },
  },
  {
    name: 'rhythm-look-make-share',
    sources: { photo: 'form-open-studios-photo.jpg', stage: 'scale-print-stage-v2.jpg' },
    changes: { 'word-0': ['font-size'], 'word-1': ['font-size'], 'word-2': ['font-size'] },
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
describe('Establish Visual Rhythm controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only its declared placement, pause or type sizes',
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
          expect(['x', 'transform', 'font-size']).toContain(attribute);
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
  it('establishes alternation, a pause between steady runs and a progressive size sequence', () => {
    const diary = svg('rhythm-studio-diary');
    const positions = (v: string) =>
      ['materials', 'workspace', 'studio', 'objects'].map((id) =>
        Number(part(group(diary, v), id + '-photograph').getAttribute('x')),
      );
    expect(positions('before')).toEqual([65, 65, 365, 65]);
    expect(positions('after')).toEqual([65, 365, 65, 365]);
    const program = svg('rhythm-open-studio-program');
    expect(part(group(program, 'after'), 'afternoon-block').getAttribute('transform')).toBe(
      'translate(0 50)',
    );
    for (const v of ['before', 'after'])
      for (const prefix of ['morning', 'afternoon']) {
        const g = group(program, v),
          ys = [0, 1, 2].map((i) => Number(part(g, prefix + '-' + i).getAttribute('y')));
        expect(ys[1] - ys[0]).toBe(40);
        expect(ys[2] - ys[1]).toBe(40);
      }
    const poster = group(svg('rhythm-look-make-share'), 'after');
    expect(
      [0, 1, 2].map((i) => Number(part(poster, 'word-' + i).getAttribute('font-size'))),
    ).toEqual([32, 48, 64]);
    for (const { name } of examples) {
      const doc = svg(name);
      expect(group(doc, 'before').textContent).toBe(group(doc, 'after').textContent);
    }
  });
  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

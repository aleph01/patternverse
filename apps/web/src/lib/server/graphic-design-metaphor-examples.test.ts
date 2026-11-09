// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findPatternGraphic, isPatternGraphic } from '../illustrations/pattern-graphics';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  { name: 'metaphor-book-growth', ids: ['seedling-cue'], differences: 1, attribute: 'opacity' },
  { name: 'metaphor-cord-anchor', ids: ['anchor-copy'], differences: 1, attribute: 'textContent' },
  { name: 'metaphor-peer-bridge', ids: ['metaphor-object'], differences: 1, attribute: 'href' },
];
const record = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/graphic-design-metaphor-layouts.json'), 'utf8'),
);
const value = (e: Element, attribute: string) =>
  attribute === 'textContent' ? e.textContent : e.getAttribute(attribute);
const svg = (name: string) => {
  const doc = new DOMParser().parseFromString(
    readFileSync(resolve(assets, name + '.svg'), 'utf8'),
    'image/svg+xml',
  );
  expect(doc.querySelector('parsererror')).toBeNull();
  return doc;
};
const group = (doc: Document, variant: string) => doc.querySelector(`[data-variant="${variant}"]`)!;
const normalized = (element: Element) => {
  const clone = element.cloneNode(true) as Element;
  clone.removeAttribute('transform');
  clone.removeAttribute('data-variant');
  return clone;
};
const element = (g: Element, id: string) => g.querySelector(`[data-element="${id}"]`)!;
describe('Use Visual Metaphors controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared metaphor cue, wording or source',
    ({ name, ids, differences, attribute }) => {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(
        ids.filter(
          (id) => value(element(before, id), attribute) !== value(element(after, id), attribute),
        ),
      ).toHaveLength(differences);
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe(attribute);
          if (attribute === 'textContent') e.textContent = 'normalized';
          else e.removeAttribute(attribute);
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVMetaphorSans');
          expect(e.getAttribute('font-weight')).toBe('400');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );

  it.each(examples)(
    '$name embeds exact source photographs, presentation and font bytes',
    ({ name }) => {
      const doc = svg(name);
      for (const { id, file } of [
        ...record.examples.find((r: { name: string }) => r.name === name).sources,
        { id: 'stage', file: 'scale-print-stage-v2.jpg' },
      ])
        expect(doc.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/' +
            (file.endsWith('.png') ? 'png' : 'jpeg') +
            ';base64,' +
            readFileSync(resolve(assets, file)).toString('base64'),
        );
      expect(doc.querySelector('defs style')!.textContent).toContain(
        'src:url(data:font/woff2;base64,' +
          readFileSync(
            resolve(root, 'docs/pattern-packages/graphic-design-pairing-fonts/pairing-sans.woff2'),
          ).toString('base64'),
      );
    },
  );

  it.each(examples)(
    '$name preserves complete artifacts and definitions in the narrow version',
    ({ name }) => {
      const wide = svg(name),
        mobile = svg(name + '-mobile');
      for (const variant of ['before', 'after'])
        expect(
          normalized(group(wide, variant)).isEqualNode(normalized(group(mobile, variant))),
        ).toBe(true);
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
    },
  );

  it('verifies declared semantics, fixed frames, copy and transparency', () => {
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant),
          r = record.examples[i];
        expect(r.declaredChanges[v]).toEqual(
          spec.ids.map((id) => ({
            element: id,
            attribute: spec.attribute,
            value: value(element(g, id), spec.attribute),
          })),
        );
        const frame = element(g, i === 0 ? 'book-window' : 'image-window');
        expect(['x', 'y', 'width', 'height'].map((a) => Number(frame.getAttribute(a)))).toEqual(
          r.frame,
        );
        expect(frame.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
        expect(frame.getAttribute('viewBox')).toBe('0 0 1536 1024');
        for (const [id, x, y, copy, size] of r.copy) {
          const t = element(g, id);
          expect(t.textContent).toBe(
            i === 1 && id === 'anchor-copy' ? r.declaredChanges[v][0].value : copy,
          );
          expect(['x', 'y', 'font-size'].map((a) => Number(t.getAttribute(a)))).toEqual([
            x,
            y,
            size,
          ]);
        }
      }
    expect(
      record.examples.map((r: { declaredChanges: { value: string }[][] }) =>
        r.declaredChanges.map((v) => v[0].value),
      ),
    ).toEqual([
      ['0', '1'],
      ['Make room for something new.', 'Plan the next steps of your project.'],
      ['#ladder', '#bridge'],
    ]);
    for (const variant of ['before', 'after']) {
      const seed = element(group(svg(examples[0].name), variant), 'seedling-window');
      expect(['x', 'y', 'width', 'height'].map((a) => Number(seed.getAttribute(a)))).toEqual([
        217, 221, 166.667, 200,
      ]);
      expect(seed.getAttribute('viewBox')).toBe('0 0 1145 1374');
    }
    for (const file of [
      'metaphor-seedling-cutout.png',
      'metaphor-ladder-cutout.png',
      'metaphor-bridge-cutout.png',
    ])
      expect(readFileSync(resolve(assets, file))[25]).toBe(6);
    for (const file of ['metaphor-book-photo.png', 'metaphor-cord-photo.png'])
      expect(readFileSync(resolve(assets, file))[25]).toBe(2);
  });

  it('has a valid mark explaining the book-as-growing-medium mapping', () => {
    const mark = findPatternGraphic('graphic-design-use-visual-metaphors');
    expect(isPatternGraphic(mark)).toBe(true);
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/graphic-design.json'), 'utf8'),
    );
    expect(mark!.mechanism).toBe(
      pkg.patterns.find((p: { id: string }) => p.id === mark!.id).short_description,
    );
    expect(mark!.reading).toContain('growing medium');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findPatternGraphic, isPatternGraphic } from '../illustrations/pattern-graphics';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  { name: 'symbols-information', ids: ['service-symbol'], differences: 1, attribute: 'href' },
  { name: 'symbols-download', ids: ['action-symbol'], differences: 1, attribute: 'href' },
  { name: 'symbols-audio-label', ids: ['audio-label'], differences: 1, attribute: 'opacity' },
];
const record = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/graphic-design-symbol-layouts.json'), 'utf8'),
);
const value = (e: Element, attribute: string) => e.getAttribute(attribute);
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
describe('Employ Recognizable Symbols controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared symbol selection or label visibility',
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
          expect(e.getAttribute('font-family')).toBe('PVSymbolSans');
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
        { id: 'stage', file: record.examples.find((r: { name: string }) => r.name === name).stage },
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

  it('preserves fixed symbol windows, photo frames and all wording while changing declared semantics', () => {
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const doc = svg(spec.name),
          g = group(doc, variant),
          r = record.examples[i];
        expect(r.declaredChanges[v]).toEqual(
          spec.ids.map((id) => ({
            element: id,
            attribute: spec.attribute,
            value: value(element(g, id), spec.attribute),
          })),
        );
        const frame = element(g, 'image-window');
        expect(['x', 'y', 'width', 'height'].map((a) => Number(frame.getAttribute(a)))).toEqual(
          r.frame,
        );
        expect(frame.getAttribute('preserveAspectRatio')).toBe('xMidYMid slice');
        expect(frame.getAttribute('viewBox')).toBe('0 0 1536 1024');
        for (const [id, x, y, copy, size] of r.copy) {
          const t = element(g, id);
          expect(t.textContent).toBe(copy);
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
      ['#rosette', '#information'],
      ['#upload', '#download'],
      ['0', '1'],
    ]);
    for (const variant of ['before', 'after']) {
      const doc = svg('symbols-download'),
        g = group(doc, variant),
        window = element(g, 'action-symbol-window');
      expect(['x', 'y', 'width', 'height'].map((a) => Number(window.getAttribute(a)))).toEqual([
        174, 635, 32, 32,
      ]);
      for (const id of ['upload', 'download'])
        expect(doc.querySelector(`defs g[id="${id}"] path`)!.getAttribute('d')).toMatch(
          /^M15 65V81H81V65M48/,
        );
      const audio = group(svg('symbols-audio-label'), variant);
      expect(element(audio, 'audio-symbol').getAttribute('href')).toBe('#headphones');
      expect(element(audio, 'audio-label').textContent).toBe('Audio guide');
    }
  });
  it('has a valid mark combining a familiar cue with a confirming label', () => {
    const mark = findPatternGraphic('graphic-design-employ-recognizable-symbols');
    expect(isPatternGraphic(mark)).toBe(true);
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/graphic-design.json'), 'utf8'),
    );
    expect(mark!.mechanism).toBe(
      pkg.patterns.find((p: { id: string }) => p.id === mark!.id).short_description,
    );
    expect(mark!.reading).toContain('confirming text label');
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

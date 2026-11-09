// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  { name: 'type-image-rise', photo: 'audience-workspace-photo.jpg', word: 'RISE' },
  { name: 'type-image-clay', photo: 'audience-pottery-photo.jpg', word: 'CLAY' },
  { name: 'type-image-mug', photo: 'explicit-tableware-photo.jpg', word: 'MUG' },
];
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

describe('Use Type as Image controlled photographic comparisons', () => {
  it.each(examples)('$name changes only the declared expressive attributes', ({ name, word }) => {
    const doc = svg(name);
    const variants = [normalized(group(doc, 'before')), normalized(group(doc, 'after'))];
    const allowed = name.endsWith('rise')
      ? 'transform'
      : name.endsWith('clay')
        ? 'fill'
        : 'opacity';
    const ids = name.endsWith('rise')
      ? ['letter-0', 'letter-1', 'letter-2', 'letter-3']
      : name.endsWith('clay')
        ? ['word']
        : ['letter-u', 'cup-body'];
    for (const g of variants) {
      const wrapper = element(g, 'expressive-type');
      expect(wrapper.getAttribute('data-word')).toBe(word);
      expect(wrapper.getAttribute('aria-label')).toBe(word);
      expect(wrapper.getAttribute('role')).toBe('img');
      const changed = Array.from(g.querySelectorAll('[data-change]'));
      expect(changed.map((e) => e.getAttribute('data-element'))).toEqual(ids);
      for (const e of changed) {
        expect(e.getAttribute('data-change')).toBe(allowed);
        e.removeAttribute(allowed);
      }
      for (const e of g.querySelectorAll('text[font-family="PVTypeImageDisplay"]')) {
        expect(e.getAttribute('font-weight')).toBe('800');
        expect(e.getAttribute('style')).toBe(
          "font-variation-settings:'wght' 800;font-optical-sizing:none",
        );
      }
    }
    expect(variants[0].isEqualNode(variants[1])).toBe(true);
  });

  it.each(examples)(
    '$name preserves exact source photographs, paper and both fonts',
    ({ name, photo }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', 'scale-print-stage-v2.jpg'],
      ])
        expect(doc.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
        );
      const style = doc.querySelector('defs style')!.textContent;
      for (const [mime, file] of [
        ['woff2', 'pairing-sans.woff2'],
        ['ttf', 'SourceSans3[wght].ttf'],
      ])
        expect(style).toContain(
          `src:url(data:font/${mime};base64,` +
            readFileSync(
              resolve(root, 'docs/pattern-packages/graphic-design-pairing-fonts', file),
            ).toString('base64'),
        );
      expect(style).toContain('font-weight:200 900');
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

  it('implements the specified placement, material fill and recognizable U restoration', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-type-image-layouts.json'),
        'utf8',
      ),
    );
    const rise = svg('type-image-rise');
    expect(record.examples[0].xPositions).toEqual([65, 156.072, 208.329, 291.741]);
    expect(record.examples[0].beforeBaselines).toEqual([590, 590, 590, 590]);
    expect(record.examples[0].afterBaselines).toEqual([590, 554, 518, 482]);
    for (const [i, letter] of ['R', 'I', 'S', 'E'].entries())
      for (const variant of ['before', 'after']) {
        const e = element(group(rise, variant), 'letter-' + i);
        expect(e.textContent).toBe(letter);
        expect(Number(e.getAttribute('x'))).toBe(record.examples[0].xPositions[i]);
        expect(e.getAttribute('y')).toBe('590');
        expect(e.getAttribute('font-size')).toBe('124');
        expect(e.getAttribute('transform')).toBe(
          `translate(0 ${variant === 'after' ? -36 * i : 0})`,
        );
      }
    const clay = svg('type-image-clay');
    for (const variant of ['before', 'after']) {
      const e = element(group(clay, variant), 'word');
      expect(e.textContent).toBe('CLAY');
      expect(e.getAttribute('font-size')).toBe('156');
      expect(e.getAttribute('fill')).toBe(variant === 'after' ? 'url(#material-fill)' : '#17352f');
    }
    expect(clay.querySelector('#material-fill')?.getAttribute('patternUnits')).toBe(
      'userSpaceOnUse',
    );
    expect(clay.querySelector('[data-element="material-crop"]')?.getAttribute('viewBox')).toBe(
      '400 350 1000 400',
    );
    const mug = svg('type-image-mug');
    for (const variant of ['before', 'after']) {
      const g = group(mug, variant);
      expect(element(g, 'letter-u').textContent).toBe('U');
      expect(element(g, 'letter-u').getAttribute('font-size')).toBe('132');
      expect(element(g, 'letter-u').getAttribute('opacity')).toBe(variant === 'after' ? '1' : '0');
      expect(element(g, 'cup-body').getAttribute('opacity')).toBe(variant === 'after' ? '0' : '1');
      expect(element(g, 'handle').getAttribute('d')).toBe(
        'M290 522H296C315 522 315 550 296 550H290',
      );
      expect(element(g, 'plain-title').textContent).toBe('MUG · Stoneware tableware');
    }
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

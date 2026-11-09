// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityArticle } from './markdown';
import { findPatternGraphic, isPatternGraphic } from '../illustrations/pattern-graphics';
const root = resolve(process.cwd(), '../..'),
  assets = resolve(root, 'content/assets/graphic-design');
const record = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/graphic-design-language-layouts.json'), 'utf8'),
);
const specs = [
  { name: 'language-cross-format-roles', changes: 4, attribute: 'font-family' },
  { name: 'language-motif-function', changes: 4, attribute: 'opacity' },
  { name: 'language-controlled-image-variation', changes: 3, attribute: 'href' },
];
const svg = (name: string) => {
  const d = new DOMParser().parseFromString(
    readFileSync(resolve(assets, name + '.svg'), 'utf8'),
    'image/svg+xml',
  );
  expect(d.querySelector('parsererror')).toBeNull();
  return d;
};
const variant = (d: Document, v: string) => d.querySelector(`[data-variant="${v}"]`)!;
const normalized = (e: Element) => {
  const c = e.cloneNode(true) as Element;
  c.removeAttribute('transform');
  return c;
};
describe('Shared visual language controlled cross-artifact comparisons', () => {
  it.each(specs)(
    '$name changes only the declared design properties',
    ({ name, changes, attribute }) => {
      const d = svg(name),
        before = variant(d, 'before'),
        after = variant(d, 'after');
      const beforeChanges = Array.from(before.querySelectorAll('[data-change]')),
        afterChanges = Array.from(after.querySelectorAll('[data-change]'));
      expect(beforeChanges).toHaveLength(changes);
      expect(afterChanges).toHaveLength(changes);
      for (const [i, e] of beforeChanges.entries()) {
        expect(e.getAttribute('data-change')).toBe(attribute);
        expect(e.getAttribute(attribute)).not.toBe(afterChanges[i].getAttribute(attribute));
      }
      const groups = [before, after].map((e) => e.cloneNode(true) as Element);
      for (const g of groups) {
        g.removeAttribute('data-variant');
        for (const a of g.querySelectorAll('[data-artifact]')) a.removeAttribute('transform');
        for (const e of g.querySelectorAll('[data-change]')) e.removeAttribute(attribute);
      }
      expect(groups[0].isEqualNode(groups[1])).toBe(true);
      expect(Array.from(before.querySelectorAll('text')).map((e) => e.textContent)).toEqual(
        Array.from(after.querySelectorAll('text')).map((e) => e.textContent),
      );
    },
  );
  it.each(specs)('$name embeds unchanged photographic and licensed font bytes', ({ name }) => {
    const d = svg(name),
      spec = record.examples.find((s: { name: string }) => s.name === name);
    for (const s of spec.sources)
      expect(d.querySelector(`defs image[id="${s.id}"]`)?.getAttribute('href')).toBe(
        'data:image/jpeg;base64,' + readFileSync(resolve(assets, s.file)).toString('base64'),
      );
    for (const file of Object.values(record.fonts))
      expect(d.querySelector('defs style')!.textContent).toContain(
        'data:font/woff2;base64,' + readFileSync(resolve(root, file as string)).toString('base64'),
      );
  });
  it.each(specs)(
    '$name preserves each complete artifact in interleaved narrow presentation',
    ({ name }) => {
      const wide = svg(name),
        mobile = svg(name + '-mobile');
      expect(wide.querySelector('defs')?.isEqualNode(mobile.querySelector('defs'))).toBe(true);
      const s = record.examples.find((s: { name: string }) => s.name === name);
      let previousEnd = 0;
      for (const a of s.artifacts) {
        const positions = [];
        for (const v of ['before', 'after']) {
          const selector = `[data-variant="${v}"] [data-artifact="${a.id}"]`;
          expect(
            normalized(wide.querySelector(selector)!).isEqualNode(
              normalized(mobile.querySelector(selector)!),
            ),
          ).toBe(true);
          positions.push(
            Number(
              mobile
                .querySelector(selector)!
                .getAttribute('transform')!
                .match(/translate\(25 ([\d.]+)\)/)![1],
            ),
          );
        }
        expect(positions[0]).toBeGreaterThan(previousEnd);
        expect(positions[1]).toBeGreaterThan(positions[0] + a.height);
        previousEnd = positions[1] + a.height;
      }
    },
  );
  it('defines shared roles, bounded signatures and an image slot without requiring identical layouts', () => {
    const d = svg(specs[0].name),
      after = variant(d, 'after');
    for (const id of ['poster', 'ticket', 'reminder']) {
      expect(after.querySelector(`[data-element="${id}-title"]`)?.getAttribute('font-family')).toBe(
        'PVLanguageTitle',
      );
      expect(after.querySelector(`[data-element="${id}-facts"]`)?.getAttribute('font-family')).toBe(
        'PVLanguageBody',
      );
    }
    const motifs = svg(specs[1].name);
    for (const v of ['before', 'after'])
      expect(variant(motifs, v).querySelectorAll('[data-element$="-signature"]')).toHaveLength(3);
    for (const e of variant(motifs, 'after').querySelectorAll('[data-change]'))
      expect(e.getAttribute('opacity')).toBe('0');
    const cards = svg(specs[2].name),
      names = ['clay', 'seed', 'coffee'];
    for (const [i, id] of names.entries()) {
      const suffix = id === 'seed' ? 'seeds' : id;
      expect(
        variant(cards, 'before')
          .querySelector(`[data-element="${id}-card-photo"]`)
          ?.getAttribute('href'),
      ).toBe('#studio');
      expect(
        variant(cards, 'after')
          .querySelector(`[data-element="${id}-card-photo"]`)
          ?.getAttribute('href'),
      ).toBe('#' + suffix);
      expect(record.examples[2].artifacts[i].height).toBe(360);
    }
  });
  it('has an explained, valid mark with shared cues in differently proportioned frames', () => {
    const mark = findPatternGraphic('graphic-design-establish-a-shared-visual-language');
    expect(isPatternGraphic(mark)).toBe(true);
    expect(mark!.reading).toContain('formats remain different');
    const pkg = JSON.parse(
      readFileSync(resolve(root, 'docs/pattern-packages/graphic-design.json'), 'utf8'),
    );
    expect(mark!.mechanism).toBe(
      pkg.patterns.find((p: { id: string }) => p.id === mark!.id).short_description,
    );
  });
  it('renders three captioned sets with descriptive alternatives and paired narrow views', async () => {
    const corpus = await loadAndCompileCorpus({
      manifestPath: resolve(root, 'patternverse.yaml'),
      contentDirectory: resolve(root, 'content'),
      readonly: true,
    });
    const entity = corpus.entities.find(
      (e) => e.id === 'graphic-design-establish-a-shared-visual-language',
    )!;
    expect(entity).toBeDefined();
    const rendered = await renderEntityArticle(entity, corpus.entities),
      d = new DOMParser().parseFromString(rendered.html, 'text/html');
    expect(d.querySelectorAll('figure')).toHaveLength(3);
    expect(d.querySelectorAll('figcaption')).toHaveLength(3);
    for (const s of specs) {
      expect(
        d.querySelector(`img[src="/assets/graphic-design/${s.name}.svg"]`)?.getAttribute('alt')
          ?.length,
      ).toBeGreaterThan(80);
      expect(
        d.querySelector(`source[srcset="/assets/graphic-design/${s.name}-mobile.svg"]`),
      ).not.toBeNull();
      expect(d.querySelector(`a[href$="/${s.name}-mobile.svg"]`)).not.toBeNull();
    }
  });
});

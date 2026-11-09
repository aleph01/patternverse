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
  readFileSync(resolve(root, 'docs/pattern-packages/graphic-design-template-layouts.json'), 'utf8'),
);
const specs = [
  { name: 'template-variable-titles', changes: 2, attributes: ['height', 'transform'] },
  { name: 'template-conditional-offers', changes: 2, attributes: ['transform', 'transform'] },
  {
    name: 'template-missing-image-and-notes',
    changes: 5,
    attributes: ['height', 'height', 'opacity', 'transform', 'height'],
  },
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
describe('Reusable template controlled multi-input comparisons', () => {
  it.each(specs)(
    '$name changes only the declared design properties',
    ({ name, changes, attributes }) => {
      const d = svg(name),
        before = variant(d, 'before'),
        after = variant(d, 'after');
      const beforeChanges = Array.from(before.querySelectorAll('[data-change]')),
        afterChanges = Array.from(after.querySelectorAll('[data-change]'));
      expect(beforeChanges).toHaveLength(changes);
      expect(afterChanges).toHaveLength(changes);
      expect(beforeChanges.map((e) => e.getAttribute('data-change'))).toEqual(attributes);
      for (const [i, e] of beforeChanges.entries()) {
        const attribute = e.getAttribute('data-change')!;
        expect(e.getAttribute(attribute)).not.toBe(afterChanges[i].getAttribute(attribute));
      }
      const groups = [before, after].map((e) => e.cloneNode(true) as Element);
      for (const g of groups) {
        g.removeAttribute('data-variant');
        for (const a of g.querySelectorAll('[data-artifact]')) a.removeAttribute('transform');
        for (const e of g.querySelectorAll('[data-change]'))
          e.removeAttribute(e.getAttribute('data-change')!);
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
        previousEnd = positions[1] + a.afterHeight;
      }
    },
  );
  it('keeps ordinary inputs unchanged and preserves every supplied word in the repaired inputs', () => {
    const ordinary = ['short-notice', 'standard-offer', 'october-review'];
    const fixtures = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-template-fixtures.json'),
        'utf8',
      ),
    );
    for (const [i, spec] of specs.entries()) {
      const d = svg(spec.name);
      expect(
        variant(d, 'before').querySelector(`[data-artifact="${ordinary[i]}"]`)?.innerHTML,
      ).toBe(variant(d, 'after').querySelector(`[data-artifact="${ordinary[i]}"]`)?.innerHTML);
    }
    const titles = svg(specs[0].name),
      long = variant(titles, 'after');
    expect(
      long.querySelector('[data-element="long-notice-title-window"]')?.getAttribute('height'),
    ).toBe('132');
    expect(long.querySelector('[data-element="long-notice-flow"]')?.getAttribute('transform')).toBe(
      'translate(0 44)',
    );
    expect(
      Array.from(long.querySelectorAll('[data-element^="long-notice-title-"]'))
        .filter((e) => e.tagName === 'text')
        .map((e) => e.textContent),
    ).toEqual(fixtures.notices[1].titleLines);
    for (const e of long.querySelectorAll('[data-element^="long-notice-title-"]'))
      if (e.tagName === 'text') expect(e.getAttribute('font-size')).toBe('38');
    const offers = variant(svg(specs[1].name), 'after');
    expect(
      offers.querySelector('[data-element="reduced-offer-conditions"]')?.getAttribute('transform'),
    ).toBe('translate(0 -72)');
    expect(
      offers.querySelector('[data-element="reduced-offer-action"]')?.getAttribute('transform'),
    ).toBe('translate(0 72)');
    expect(
      Array.from(offers.querySelectorAll('[data-element^="reduced-offer-condition-"]')).map(
        (e) => e.textContent,
      ),
    ).toEqual(fixtures.offers[1].conditionLines);
    const reviews = variant(svg(specs[2].name), 'after'),
      november = reviews.querySelector('[data-artifact="november-review"]')!;
    expect(fixtures.reviews[1].image).toBeNull();
    expect(
      november.querySelector('[data-element="november-review-image"]')?.getAttribute('opacity'),
    ).toBe('0');
    expect(
      november
        .querySelector('[data-element="november-review-note-window"]')
        ?.getAttribute('height'),
    ).toBe('94');
    expect(november.querySelector('[data-element="surface"]')?.getAttribute('height')).toBe('406');
    expect(
      november.querySelector('[data-element="november-review-workshop-value"]')?.textContent,
    ).toBe('10');
    expect(
      november.querySelector('[data-element="november-review-places-value"]')?.textContent,
    ).toBe('68 / 80');
    expect(
      Array.from(november.querySelectorAll('[data-element^="november-review-note-"]'))
        .filter((e) => e.tagName === 'text')
        .map((e) => e.textContent),
    ).toEqual(fixtures.reviews[1].noteLines);
  });
  it('has an explained, valid mark for variable editions', () => {
    const mark = findPatternGraphic('graphic-design-build-reusable-templates');
    expect(isPatternGraphic(mark)).toBe(true);
    expect(mark!.reading).toContain('changing content');
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
    const entity = corpus.entities.find((e) => e.id === 'graphic-design-build-reusable-templates')!;
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

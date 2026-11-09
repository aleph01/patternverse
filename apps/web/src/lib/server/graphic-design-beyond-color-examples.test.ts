// @vitest-environment jsdom

import { expectGraphicDesignComparisonDiscovery } from './graphic-design-comparison-discovery';

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(process.cwd(), '../..');
const assets = resolve(root, 'content/assets/graphic-design');
const examples = [
  {
    name: 'beyond-color-session-status',
    photo: 'audience-pottery-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['status-label-0', 'status-label-1', 'status-label-2'],
    differences: 3,
    attribute: 'opacity',
  },
  {
    name: 'beyond-color-actual-plan',
    photo: 'form-open-studios-photo.jpg',
    stage: 'scale-print-stage-v2.jpg',
    ids: ['plan-key', 'plan-line'],
    differences: 2,
    attribute: 'stroke-dasharray',
  },
  {
    name: 'beyond-color-email-error',
    photo: 'audience-workspace-photo.jpg',
    stage: 'audience-phone-stage.jpg',
    ids: ['error-description', 'error-instruction'],
    differences: 2,
    attribute: 'opacity',
  },
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
describe('Reinforce Meaning Beyond Color controlled photographic comparisons', () => {
  it.each(examples)(
    '$name changes only the declared reinforcing cues',
    ({ name, ids, differences, attribute }) => {
      const doc = svg(name),
        before = group(doc, 'before'),
        after = group(doc, 'after');
      expect(
        ids.filter(
          (id) =>
            element(before, id).getAttribute(attribute) !==
            element(after, id).getAttribute(attribute),
        ),
      ).toHaveLength(differences);
      const variants = [normalized(before), normalized(after)];
      for (const g of variants) {
        const changes = Array.from(g.querySelectorAll('[data-change]'));
        expect(changes.map((e) => e.getAttribute('data-element'))).toEqual(ids);
        for (const e of changes) {
          expect(e.getAttribute('data-change')).toBe(attribute);
          e.removeAttribute(attribute);
        }
        for (const e of g.querySelectorAll('text')) {
          expect(e.getAttribute('font-family')).toBe('PVBeyondColorSans');
          expect(e.getAttribute('font-weight')).toBe('400');
        }
      }
      expect(variants[0].isEqualNode(variants[1])).toBe(true);
    },
  );

  it.each(examples)(
    '$name embeds exact source photographs, presentation and font bytes',
    ({ name, photo, stage }) => {
      const doc = svg(name);
      for (const [id, file] of [
        ['photo', photo],
        ['stage', stage],
      ])
        expect(doc.querySelector(`defs image[id="${id}"]`)?.getAttribute('href')).toBe(
          'data:image/jpeg;base64,' + readFileSync(resolve(assets, file)).toString('base64'),
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

  it('keeps cue meanings, colors, chart data and form state synchronized', () => {
    const record = JSON.parse(
      readFileSync(
        resolve(root, 'docs/pattern-packages/graphic-design-beyond-color-layouts.json'),
        'utf8',
      ),
    );
    for (const [i, spec] of examples.entries())
      for (const [v, variant] of ['before', 'after'].entries()) {
        const g = group(svg(spec.name), variant);
        expect(record.examples[i].declaredChanges[v]).toEqual(
          spec.ids.map((id) => ({
            element: id,
            attribute: spec.attribute,
            value: element(g, id).getAttribute(spec.attribute),
          })),
        );
      }
    const schedule = svg(examples[0].name);
    for (const variant of ['before', 'after']) {
      const g = group(schedule, variant);
      for (const [i, session] of record.sessions.entries()) {
        expect(element(g, 'status-dot-' + i).getAttribute('fill')).toBe(session.color);
        expect(element(g, 'legend-dot-' + i).getAttribute('fill')).toBe(session.color);
        expect(element(g, 'status-label-' + i).textContent).toBe(session.status);
        expect(element(g, 'legend-label-' + i).textContent).toBe(session.status);
        expect(element(g, 'details-' + i).textContent).toBe(session.detail);
        expect(element(g, 'status-label-' + i).getAttribute('opacity')).toBe(
          variant === 'before' ? '0' : '1',
        );
      }
    }
    const report = svg(examples[1].name),
      c = record.chart;
    for (const variant of ['before', 'after']) {
      const g = group(report, variant);
      for (const series of ['actual', 'plan']) {
        const line = element(g, series + '-line'),
          key = element(g, series + '-key');
        const points = c[series]
          .map((v: number, i: number) => `${c.x[i]} ${c.baseline - (v - c.axisMinimum) * c.scale}`)
          .join('L');
        expect(line.getAttribute('d')).toBe('M' + points);
        expect(line.getAttribute('stroke')).toBe(key.getAttribute('stroke'));
        expect(line.getAttribute('stroke-width')).toBe('3');
        if (series === 'plan')
          for (const e of [line, key])
            expect(e.getAttribute('stroke-dasharray')).toBe(variant === 'before' ? 'none' : '10 7');
        else expect(line.hasAttribute('stroke-dasharray')).toBe(false);
      }
      expect(element(g, 'actual-values').textContent).toBe('Actual 42 · 56 · 64 · 76');
      expect(element(g, 'plan-values').textContent).toBe('Plan 50 · 58 · 66 · 74');
    }
    const form = svg(examples[2].name);
    for (const variant of ['before', 'after']) {
      const g = group(form, variant);
      expect(element(g, 'name-value').textContent).toBe(record.form.name);
      expect(element(g, 'email-input').getAttribute('stroke')).toBe(record.colors.red);
      expect(element(g, 'email-input').tagName).toBe('rect');
      expect(g.querySelector('[data-element="email-value"]')).toBeNull();
      expect(record.form.email).toBe('');
      expect(element(g, 'error-description').textContent).toBe(record.form.errorDescription);
      expect(element(g, 'error-instruction').textContent).toBe(record.form.errorInstruction);
      expect(element(g, 'error-description').getAttribute('opacity')).toBe(
        variant === 'before' ? '0' : '1',
      );
      expect(element(g, 'error-instruction').getAttribute('opacity')).toBe(
        variant === 'before' ? '0' : '1',
      );
      expect(element(g, 'footer').textContent).toBe('Day pass · £18');
    }
  });

  it('keeps each controlled comparison discoverable with its captions and full-size/narrow views', async () => {
    await expectGraphicDesignComparisonDiscovery(examples.map(({ name }) => name));
  });
});

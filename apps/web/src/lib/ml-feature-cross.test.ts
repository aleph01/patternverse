// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-feature-cross.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-feature-cross');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Feature Cross fitted interactions', () => {
  it('reproduces the reference encoding, fits, predictions and training errors', () => {
    const dom = openExample();
    try {
      const r = read(dom, 'report'),
        f = reference.example.default;
      expect(r.cells.map((s: { y: number }) => s.y)).toEqual(
        reference.example.default_targets_minutes,
      );
      expect(r.cells.map((s: { id: string }) => s.id)).toEqual(reference.example.pair_order);
      const closeArray = (actual: number[], expected: number[]) => {
        expect(actual).toHaveLength(expected.length);
        actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], 9));
      };
      closeArray(r.separate.coefficients, f.separate_coefficients);
      closeArray(r.crossed.coefficients, f.crossed_coefficients);
      closeArray(
        r.cells.map((s: { separate: number }) => s.separate),
        f.separate_predictions,
      );
      closeArray(
        r.cells.map((s: { crossed: number }) => s.crossed),
        f.crossed_predictions,
      );
      expect(r.trainingMae.separate).toBeCloseTo(3.75, 9);
      expect(r.trainingMae.crossed).toBeCloseTo(0, 9);
      expect(r.heldoutMae.crossed).toBeNull();
      expect(read(dom, 'pairs.map(p=>encode(p.vehicle,p.weather))')).toEqual([
        [1, 0, 0, 0],
        [1, 0, 1, 0],
        [1, 1, 0, 0],
        [1, 1, 1, 1],
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('checks all twenty-four configurations against closed-form balanced-design oracles', () => {
    const dom = openExample();
    try {
      const before = dom.window.eval('JSON.stringify(pairs)');
      for (const delta of reference.example.interaction_choices)
        for (const coverage of reference.example.coverage_choices)
          for (const pair of reference.example.pair_order) {
            const r = read(dom, `buildReport(${delta},'${coverage}','${pair}')`),
              all = coverage === 'all';
            const separate = all
                ? [20 - delta / 4, 10 + delta / 2, 20 + delta / 2, 0]
                : [20, 10, 20, 0],
              cross = [20, 10, 20, all ? delta : 0];
            r.separate.coefficients.forEach((v: number, i: number) =>
              expect(v).toBeCloseTo(separate[i], 9),
            );
            r.crossed.coefficients.forEach((v: number, i: number) =>
              expect(v).toBeCloseTo(cross[i], 9),
            );
            expect(r.inspected.id).toBe(pair);
            expect(r.crossed.identifiable).toBe(all);
            for (let i = 0; i < 4; i++) {
              const c = i >= 2 ? 1 : 0,
                w = i % 2;
              expect(r.cells[i].separate).toBeCloseTo(
                separate[0] + separate[1] * c + separate[2] * w,
                9,
              );
              expect(r.cells[i].crossed).toBeCloseTo(
                20 + 10 * c + 20 * w + (all ? delta : 0) * c * w,
                9,
              );
            }
            expect(r.trainingMae.separate).toBeCloseTo(all ? Math.abs(delta) / 4 : 0, 9);
            expect(r.trainingMae.crossed).toBeCloseTo(0, 9);
            if (all) {
              expect(r.heldoutMae).toEqual({ separate: null, crossed: null });
            } else {
              expect(r.heldoutMae.separate).toBeCloseTo(Math.abs(delta), 9);
              expect(r.heldoutMae.crossed).toBeCloseTo(Math.abs(delta), 9);
            }
          }
      expect(dom.window.eval('JSON.stringify(pairs)')).toBe(before);
    } finally {
      dom.window.close();
    }
  });
  it('fits changed observed targets and satisfies least-squares normal-equation residual conditions', () => {
    const dom = openExample();
    try {
      const rows = read(dom, 'makeData(-15)');
      rows[0].y = 22;
      const r = read(dom, `compare(${JSON.stringify(rows)},'all')`);
      expect(r.crossed.coefficients[0]).toBeCloseTo(22, 9);
      expect(r.crossed.coefficients[1]).toBeCloseTo(8, 9);
      expect(r.crossed.coefficients[2]).toBeCloseTo(18, 9);
      expect(r.crossed.coefficients[3]).toBeCloseTo(-13, 9);
      for (const key of ['separate', 'crossed']) {
        const residuals = r.cells.map(
          (s: { y: number; separate: number; crossed: number }) =>
            s[key as 'separate' | 'crossed'] - s.y,
        );
        for (const column of key === 'separate' ? [0, 1, 2] : [0, 1, 2, 3]) {
          const dot = residuals.reduce((sum: number, error: number, i: number) => {
            const c = i >= 2 ? 1 : 0,
              w = i % 2;
            return sum + error * [1, c, w, c * w][column];
          }, 0);
          expect(dot).toBeCloseTo(0, 9);
        }
      }
      const reordered = read(dom, "compare(makeData(-15).reverse(),'all')");
      reordered.crossed.coefficients.forEach((v: number, i: number) =>
        expect(v).toBeCloseTo(reference.example.default.crossed_coefficients[i], 9),
      );
    } finally {
      dom.window.close();
    }
  });
  it('never fits withheld targets and rejects invalid, duplicate or unidentified training designs', () => {
    const dom = openExample();
    try {
      const rows = read(dom, 'makeData(-15)'),
        original = read(dom, "compare(makeData(-15),'withheld')");
      rows[3].y = 135;
      const changed = read(dom, `compare(${JSON.stringify(rows)},'withheld')`);
      expect(changed.separate).toEqual(original.separate);
      expect(changed.crossed).toEqual(original.crossed);
      expect(changed.inspected.crossed).toBeCloseTo(50, 9);
      expect(changed.heldoutMae.crossed).toBeCloseTo(85, 9);
      expect(original.crossed.identifiable).toBe(false);
      expect(original.heldoutMae.crossed).toBeCloseTo(15, 9);
      for (const expr of [
        "encode('train','wet')",
        "encode('car','snow')",
        'buildReport(-1)',
        "buildReport(-15,'unknown')",
        "buildReport(-15,'all','unknown')",
        'fitModel([],false)',
        'fitModel(makeData(-15).slice(0,2),false)',
        'fitModel([makeData(-15)[0],makeData(-15)[0]],false)',
        'fitModel([{...makeData(-15)[0],y:NaN}],false)',
      ])
        expect(() => dom.window.eval(expr)).toThrow();
      expect(read(dom, 'pairs.every(Object.isFrozen)')).toBe(true);
    } finally {
      dom.window.close();
    }
  });
  it('updates fitting and inspected-pair controls and resets optional details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const el = d.querySelector(id) as HTMLSelectElement;
          el.value = value;
          el.dispatchEvent(new dom.window.Event('change'));
        };
      change('#coverage', 'withheld');
      expect(d.querySelector('#metrics')!.textContent).toContain('cross 15 min');
      expect(d.querySelector('#identified')!.textContent).toContain('not estimated');
      change('#interaction', '10');
      expect(read(dom, 'report.inspected.crossed')).toBeCloseTo(50, 9);
      expect(read(dom, 'report.heldoutMae.crossed')).toBeCloseTo(10, 9);
      change('#coverage', 'all');
      change('#interaction', '0');
      expect(d.querySelector('#interpretation')!.textContent).toContain('same wet-weather change');
      change('#pair', 'bike-dry');
      expect(d.querySelector('#encoding')!.textContent).toContain('[1, 0, 0, 0]');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 850');
      for (const el of d.querySelectorAll('details')) (el as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        interaction: -15,
        coverage: 'all',
        selected: 'car-wet',
      });
      expect(d.querySelectorAll('#cells tbody tr')).toHaveLength(4);
      for (const el of d.querySelectorAll('details'))
        expect((el as HTMLDetailsElement).open).toBe(false);
    } finally {
      dom.window.close();
    }
  });
  it('integrates the fixed article structure, authoritative sources, metadata and responsive explorer assets', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const entity = corpus.entities.find((e) => e.id === 'ml-feature-cross')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/feature-cross.svg');
    expect(rendered).toContain('/assets/machine-learning/feature-cross-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-feature-cross.md'), 'utf8');
    expect([...md.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(metadata.article_structure);
    const words = md
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .split('## Sources and further reading')[0]
      .split(/\s+/)
      .filter(Boolean).length;
    expect(words).toBe(reference.article_words);
    expect(words).toBeGreaterThanOrEqual(800);
    expect(words).toBeLessThanOrEqual(1500);
    for (const url of reference.sources) expect(md).toContain(url);
    expect(reference.example_user_queries).toHaveLength(12);
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/feature-cross' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Cross coefficient: -15 min');
    }
  });
});

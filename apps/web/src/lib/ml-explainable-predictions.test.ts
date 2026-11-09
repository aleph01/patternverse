// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(
  resolve(root, 'content/assets/widgets/ml-explainable-predictions.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-explainable-predictions',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Explainable Predictions exact attribution and reference choices', () => {
  it('computes exact two-feature allocations and the documented default and changed-reference fixtures', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'references')).toEqual(reference.example.references);
      expect(read(dom, 'report')).toMatchObject({
        model: 'M1',
        point: [5, 1],
        mean: [2, 0],
        values: [14, 20, 18, 24],
        baseline: 14,
        contributions: [6, 4],
        prediction: 24,
        reconstructed: 24,
        residual: 0,
      });
      expect(read(dom, 'report.distanceFirst')).toEqual({ distance: 6, rush: 4 });
      expect(read(dom, 'report.rushFirst')).toEqual({ distance: 6, rush: 4 });
      expect(read(dom, "buildReport(5,1,'M')")).toMatchObject({
        mean: [4, 0.5],
        values: [20, 22, 22, 24],
        baseline: 20,
        contributions: [2, 2],
        prediction: 24,
      });
      expect(read(dom, 'report.values')).toEqual(reference.example.default.coalition_values);
    } finally {
      dom.window.close();
    }
  });
  it('independently verifies all twelve configurations against additive-model identities', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const distance of [1, 5, 8])
        for (const rush of [0, 1])
          for (const ref of ['S', 'M']) {
            count++;
            const mean = ref === 'S' ? [2, 0] : [4, 0.5],
              baseline = 10 + 2 * mean[0] + 4 * mean[1],
              contributions = [2 * (distance - mean[0]), 4 * (rush - mean[1])],
              prediction = 10 + 2 * distance + 4 * rush;
            const r = read(dom, `buildReport(${distance},${rush},'${ref}')`);
            expect(r.baseline).toBe(baseline);
            expect(r.prediction).toBe(prediction);
            expect(r.contributions).toEqual(contributions);
            expect(r.values).toEqual([
              baseline,
              10 + 2 * distance + 4 * mean[1],
              10 + 2 * mean[0] + 4 * rush,
              prediction,
            ]);
            expect(r.reconstructed).toBe(prediction);
            expect(r.residual).toBe(0);
            expect(r.steps).toEqual([baseline, baseline + contributions[0], prediction]);
            expect(r.distanceFirst.distance).toBe(contributions[0]);
            expect(r.rushFirst.distance).toBe(contributions[0]);
            expect(r.distanceFirst.rush).toBe(contributions[1]);
            expect(r.rushFirst.rush).toBe(contributions[1]);
          }
      expect(count).toBe(12);
    } finally {
      dom.window.close();
    }
  });
  it('uses unconditional row replacement, preserves fixtures, and rejects invalid contracts', () => {
    const dom = openExample();
    try {
      // Keeping distance 5 still averages rush 0 and 1, rather than selecting the matching background row.
      expect(read(dom, 'coalition([5,1],references.M,1)')).toBe(22);
      expect(read(dom, 'explain([5,1],[...references.M].reverse())')).toEqual(
        read(dom, 'explain([5,1],references.M)'),
      );
      expect(read(dom, 'predict([0,0])')).toBe(10);
      expect(read(dom, 'predict([2.5,1])')).toBe(19);
      expect(
        read(
          dom,
          'Object.isFrozen(model)&&Object.isFrozen(model.coefficients)&&Object.isFrozen(references)&&Object.isFrozen(references.M)&&references.M.every(Object.isFrozen)',
        ),
      ).toBe(true);
      dom.window.eval(
        'const changed = buildReport(); changed.point[0] = 999; changed.values[0] = 999;',
      );
      expect(read(dom, 'buildReport().prediction')).toBe(24);
      expect(read(dom, 'references')).toEqual(reference.example.references);
      for (const expression of [
        'predict([])',
        'predict([-1,0])',
        'predict([NaN,0])',
        'predict([Infinity,0])',
        'predict([1e308,1])',
        'predict([1,.5])',
        'predict([1,true])',
        'explain([5,1],[])',
        'explain([5,1],[[1,2]])',
        'coalition([5,1],references.S,4)',
        'coalition([5,1],references.S,NaN)',
        "buildReport(2,1,'S')",
        "buildReport(5,2,'S')",
        "buildReport(5,1,'constructor')",
      ])
        expect(() => dom.window.eval(expression)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('separates negative attributions and an exact model-input change from measured intervention effects', () => {
    const dom = openExample();
    try {
      expect(read(dom, "buildReport(1,0,'M')")).toMatchObject({
        baseline: 20,
        contributions: [-6, -2],
        prediction: 12,
      });
      expect(read(dom, "buildReport(5,0,'S').prediction-buildReport(5,1,'S').prediction")).toBe(
        reference.example.input_change.difference,
      );
      expect(read(dom, "buildReport(5,1,'S').prediction")).toBe(
        read(dom, "buildReport(5,1,'M').prediction"),
      );
      expect(source).toContain('not an estimated benefit of changing departure time');
    } finally {
      dom.window.close();
    }
  });
  it('updates every control, exposes exact subset values, draws for phone and resets', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const e = d.querySelector(id) as HTMLSelectElement;
          e.value = value;
          e.dispatchEvent(new dom.window.Event('change'));
        };
      change('#reference', 'M');
      expect(d.querySelector('output')!.textContent).toContain(
        'Prediction 24 min; reference 20 min, distance +2 min, rush +2 min',
      );
      expect(d.querySelectorAll('#subsets tbody tr')).toHaveLength(4);
      expect(d.querySelectorAll('#orders tbody tr')).toHaveLength(2);
      change('#distance', '1');
      change('#rush', '0');
      expect(d.querySelector('output')!.textContent).toContain(
        'Prediction 12 min; reference 20 min, distance -6 min, rush -2 min',
      );
      expect(d.querySelector('#reconstruction')!.textContent).toContain('20 − 6 − 2 = 12 min');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 740');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({ point: [5, 1], reference: 'S', prediction: 24 });
      for (const e of d.querySelectorAll('details'))
        expect((e as HTMLDetailsElement).open).toBe(false);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-explainable-predictions')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-evaluation-and-uncertainty',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/explainable-predictions.svg');
    expect(rendered).toContain('/assets/machine-learning/explainable-predictions-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-explainable-predictions.md'),
      'utf8',
    );
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
    expect(reference.visual.interactive_asset).toBe('ml-explainable-predictions.html');
    expect(reference.collections).toContain('machine-learning-evaluation-and-uncertainty');
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/explainable-predictions' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('14 + 6 + 4 = 24 min');
    }
  });
});

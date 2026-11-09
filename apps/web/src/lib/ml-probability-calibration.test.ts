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
  resolve(root, 'content/assets/widgets/ml-probability-calibration.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-probability-calibration',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Probability Calibration worked example', () => {
  it('fits the documented temperature on calibration records and scores distinct evaluation records', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
      expect(result.fit.temperature).toBeCloseTo(reference.example.default_temperature, 12);
      expect(result.calibration).toHaveLength(20);
      expect(result.evaluation).toHaveLength(20);
      expect(
        new Set([...result.calibration, ...result.evaluation].map((r: { id: string }) => r.id))
          .size,
      ).toBe(40);
      for (const key of ['raw', 'mapped']) {
        const actual = result[key],
          expected = reference.example.default_evaluation_results[key];
        expect(actual.brier).toBeCloseTo(expected.brier, 12);
        expect(actual.logLoss).toBeCloseTo(expected.log_loss, 12);
        expect(actual.binnedError).toBeCloseTo(expected.binned_error, 12);
        expect(actual.correct).toBe(expected.correct);
        expect(actual.actions).toBe(expected.actions);
      }
      expect(result.calRaw).toBeCloseTo(reference.example.calibration_log_loss.raw, 12);
      expect(result.calMapped).toBeCloseTo(reference.example.calibration_log_loss.mapped, 12);
      expect(result.mapped.predictions[0].p).toBeCloseTo(0.2, 12);
      expect(result.mapped.predictions[10].p).toBeCloseTo(0.8, 12);
      expect(result.fit.bound).toBe('interior');
    } finally {
      dom.window.close();
    }
  });

  it('matches an independent inverse-temperature derivative/root calculation for all 121 fits', () => {
    const dom = openExample();
    try {
      const fits = JSON.parse(
        dom.window.eval(
          `JSON.stringify(Array.from({length:11},(_,low)=>Array.from({length:11},(_,high)=>{const r=buildReport(low,high,'moderate',5);return {low,high,rows:r.calibration,fit:r.fit,raw:r.calRaw,mapped:r.calMapped};})).flat())`,
        ),
      );
      for (const { rows, fit, raw, mapped } of fits) {
        const derivative = (inverse: number) =>
          rows.reduce(
            (sum: number, r: { z: number; y: number }) =>
              sum + r.z * (1 / (1 + Math.exp(-r.z * inverse)) - r.y),
            0,
          ) / rows.length;
        let lo = 0.1,
          hi = 4;
        let optimum: number;
        if (derivative(lo) >= 0) optimum = lo;
        else if (derivative(hi) <= 0) optimum = hi;
        else {
          for (let i = 0; i < 70; i++) {
            const mid = (lo + hi) / 2;
            if (derivative(mid) > 0) hi = mid;
            else lo = mid;
          }
          optimum = (lo + hi) / 2;
        }
        expect(1 / fit.temperature).toBeCloseTo(optimum, 10);
        expect(fit.temperature).toBeGreaterThanOrEqual(0.25);
        expect(fit.temperature).toBeLessThanOrEqual(10);
        expect(mapped).toBeLessThanOrEqual(raw + 1e-12);
        if (fit.bound === 'interior') expect(derivative(1 / fit.temperature)).toBeCloseTo(0, 12);
      }
      expect(fits).toHaveLength(121);
    } finally {
      dom.window.close();
    }
  });

  it('matches independent count formulas across all 1,089 calibration, evaluation, and bin choices', () => {
    const dom = openExample();
    try {
      const configs = JSON.parse(
        dom.window.eval(
          `JSON.stringify(Array.from({length:11},(_,low)=>Array.from({length:11},(_,high)=>Object.keys(scenarios).flatMap(scenario=>[1,2,5].map(bins=>{const r=buildReport(low,high,scenario,bins);return {low,high,scenario,bins,T:r.fit.temperature,raw:r.raw,mapped:r.mapped};})))).flat(2))`,
        ),
      );
      const fitted = new Map<string, number>();
      for (const { low, high, scenario, bins, T, raw, mapped } of configs) {
        const q = ({ moderate: 0.7, aligned: 0.9, reversed: 0.2 } as Record<string, number>)[
          scenario
        ];
        const key = low + ',' + high;
        if (fitted.has(key)) expect(T).toBe(fitted.get(key));
        else fitted.set(key, T);
        for (const [actual, temp] of [
          [raw, 1],
          [mapped, T],
        ] as const) {
          const p = 1 / (1 + Math.exp(-Math.log(9) / temp));
          expect(actual.brier).toBeCloseTo(q * (1 - p) ** 2 + (1 - q) * p * p, 11);
          expect(actual.logLoss).toBeCloseTo(-q * Math.log(p) - (1 - q) * Math.log(1 - p), 10);
          expect(actual.correct).toBe(Math.round(20 * q));
          expect(actual.actions).toBe(p > 0.85 + 1e-12 ? 10 : 0);
          const merged = bins === 1 || (bins === 5 && p < 0.6 - 1e-12);
          expect(actual.binnedError).toBeCloseTo(merged ? 0 : Math.abs(p - q), 11);
          expect(actual.bins).toHaveLength(merged ? 1 : 2);
          expect(actual.bins.reduce((s: number, b: { n: number }) => s + b.n, 0)).toBe(20);
          expect(actual.predictions.every((r: { p: number }) => r.p > 0 && r.p < 1)).toBe(true);
        }
      }
      expect(configs).toHaveLength(1089);
      expect(fitted.size).toBe(121);
    } finally {
      dom.window.close();
    }
  });

  it('exposes bin cancellation, adverse evaluation transfer, unchanged ordering, and cost thresholds', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(
        dom.window.eval(
          `JSON.stringify({fine:buildReport(2,8,'moderate',5),coarse:buildReport(2,8,'moderate',1),aligned:buildReport(2,8,'aligned',5),reversed:buildReport(2,8,'reversed',5)})`,
        ),
      );
      expect(result.fine.fit).toEqual(result.coarse.fit);
      expect(result.fine.fit).toEqual(result.aligned.fit);
      expect(result.fine.fit).toEqual(result.reversed.fit);
      for (const key of ['raw', 'mapped']) {
        expect(result.coarse[key].binnedError).toBeCloseTo(0, 12);
        expect(result.coarse[key].predictions).toEqual(result.fine[key].predictions);
        expect(result.coarse[key].brier).toBe(result.fine[key].brier);
        expect(result.coarse[key].logLoss).toBe(result.fine[key].logLoss);
      }
      expect(result.aligned.mapped.brier).toBeGreaterThan(result.aligned.raw.brier);
      expect(result.aligned.mapped.logLoss).toBeGreaterThan(result.aligned.raw.logLoss);
      expect(result.reversed.raw.correct).toBe(4);
      expect(result.reversed.mapped.correct).toBe(4);
      const values = JSON.parse(
        dom.window.eval('JSON.stringify([-4,-1,0,1,4].map(z=>sigmoid(z/report.fit.temperature)))'),
      );
      expect(values[2]).toBe(0.5);
      for (let i = 1; i < values.length; i++) expect(values[i]).toBeGreaterThan(values[i - 1]);
      const d = reference.example.decision_example;
      expect(d.prevented_loss_if_issue * d.raw_probability - d.visit_cost).toBe(d.raw_net_benefit);
      expect(d.prevented_loss_if_issue * d.mapped_probability - d.visit_cost).toBe(
        d.mapped_net_benefit,
      );
      expect(d.visit_cost / d.prevented_loss_if_issue).toBe(0.85);
    } finally {
      dom.window.close();
    }
  });

  it('refits only calibration changes, handles both bounds and invalid inputs, resizes, and resets', () => {
    const dom = openExample();
    try {
      const document = dom.window.document;
      const change = (id: string, value: string) => {
        const el = document.querySelector('#' + id);
        el.value = value;
        el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      };
      const initial = document.querySelector('output').textContent;
      change('bins', '1');
      expect(document.querySelectorAll('#reliability tr')).toHaveLength(2);
      change('scenario', 'aligned');
      expect(document.querySelector('#interpretation').textContent).toContain('worsen');
      expect(dom.window.eval('report.fit.temperature')).toBeCloseTo(
        reference.example.default_temperature,
        12,
      );
      change('low', '8');
      change('high', '2');
      expect(document.querySelector('#fitting').textContent).toContain(
        'Upper temperature bound reached: T = 10',
      );
      change('low', '0');
      change('high', '10');
      expect(document.querySelector('#fitting').textContent).toContain(
        'Lower temperature bound reached: T = 0.25',
      );
      change('low', '1.5');
      expect(document.querySelector('output').textContent).toContain('whole positive-label counts');
      expect(document.querySelectorAll('svg rect')).toHaveLength(0);
      expect(document.querySelectorAll('#metrics tr')).toHaveLength(0);
      expect(document.querySelectorAll('#data tr')).toHaveLength(0);
      document.querySelector('#reset').click();
      expect(document.querySelector('output').textContent).toBe(initial);
      expect(document.querySelector('#low').value).toBe('2');
      expect(document.querySelector('#high').value).toBe('8');
      expect(document.querySelector('#bins').value).toBe('5');
      expect(document.querySelector('#scenario').value).toBe('moderate');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(document.querySelector('svg').getAttribute('viewBox')).toBe('0 0 328 360');
      expect(document.querySelectorAll('#data tr')).toHaveLength(40);
      expect(document.querySelectorAll('#reliability tr')).toHaveLength(4);
    } finally {
      dom.window.close();
    }
  });

  it('integrates the exact article structure, sources, metadata, diagram, and explorer without practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-probability-calibration')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-evaluation-and-uncertainty',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/probability-calibration.svg');
    expect(rendered).toContain('/assets/machine-learning/probability-calibration-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-probability-calibration.md'),
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
    expect(reference.example_user_queries.length).toBeGreaterThanOrEqual(8);
  });
});

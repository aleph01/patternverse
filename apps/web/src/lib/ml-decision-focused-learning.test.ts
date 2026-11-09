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
  resolve(root, 'content/assets/widgets/ml-decision-focused-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-decision-focused-learning',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Decision-Focused Learning worked example', () => {
  it('fits the two checked parameters and evaluates actions using true benefits', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(dom.window.eval('JSON.stringify(fitted)'));
      for (const [actual, expected] of [
        [result.mseFit, reference.example.mse_fit],
        [result.decisionFit, reference.example.decision_fit],
      ]) {
        expect(actual.theta).toBe(expected.theta);
        actual.prediction.forEach((v: number, i: number) =>
          expect(v).toBeCloseTo(expected.predictions[i], 12),
        );
        expect(actual.mse).toBeCloseTo(expected.mse, 12);
        expect(actual.action.mask).toBe(expected.mask);
        expect(actual.benefit).toBe(expected.benefit);
        expect(actual.regret).toBe(expected.regret);
      }
      expect(result.oracle.value).toBe(11);
      expect(result.oracle.mask).toBe(3);
      expect(result.candidates).toHaveLength(21);
      expect(result.decisionFit.mse).toBeGreaterThan(result.mseFit.mse);
    } finally {
      dom.window.close();
    }
  });

  it('enumerates exact feasible subsets and applies explicit optimizer and parameter ties', () => {
    const dom = openExample();
    try {
      expect(JSON.parse(dom.window.eval('JSON.stringify(subsets(4).map(s=>s.mask))'))).toEqual([
        0, 1, 2, 3, 4,
      ]);
      expect(dom.window.eval('solve(predict(1),4).mask')).toBe(4);
      expect(dom.window.eval('solve(predict(1.1),4).mask')).toBe(3);
      expect(dom.window.eval('solve([5,5,0],2).mask')).toBe(1);
      expect(dom.window.eval('solve([0,0,0],7).mask')).toBe(0);
      expect(dom.window.eval('fitBoth([5.55,4.55,10.575],4).mseFit.theta')).toBe(0);
      const solved = JSON.parse(
        dom.window.eval(
          'JSON.stringify([2,3,4,5,6,7].flatMap(b=>grid.map(t=>({b,t,mask:solve(predict(t),b).mask}))))',
        ),
      );
      for (const { b, t, mask } of solved)
        expect(mask).toBe(b === 2 ? 1 : b === 3 ? 4 : b === 4 ? (t <= 1 ? 4 : 3) : b <= 6 ? 5 : 7);
      expect(solved).toHaveLength(126);
    } finally {
      dom.window.close();
    }
  });

  it('agrees with a closed-form MSE optimum and independent subset values across 384 cases', () => {
    const dom = openExample();
    try {
      const results = JSON.parse(
        dom.window.eval(
          'JSON.stringify((()=>{const out=[];for(const a of [0,5,10,30])for(const b of [0,5,10,30])for(const c of [0,5,10,30])for(const budget of [2,3,4,5,6,7]){const r=fitBoth([a,b,c],budget);out.push({truth:[a,b,c],budget,oracle:r.oracle.value,m:r.mseFit,d:r.decisionFit});}return out;})())',
        ),
      );
      const choices = [[], [0], [1], [2], [0, 1], [0, 2], [1, 2], [0, 1, 2]];
      for (const { truth, budget, oracle, m, d } of results) {
        const target = Math.max(
          0,
          Math.min(2, (truth[0] - 5.5 + (truth[1] - 4.5) + 1.5 * (truth[2] - 10.5)) / 4.25),
        );
        const lo = Math.floor(target * 10) / 10,
          hi = Math.ceil(target * 10) / 10;
        const expectedM = Math.abs(target - lo) <= Math.abs(target - hi) + 1e-9 ? lo : hi;
        expect(m.theta).toBeCloseTo(expectedM, 12);
        expect(d.theta).toBe(budget === 4 && truth[0] + truth[1] > truth[2] ? 1.1 : 0);
        const value = Math.max(
          ...choices
            .filter((ids) => ids.reduce((s, i) => s + [2, 2, 3][i], 0) <= budget)
            .map((ids) => ids.reduce((s, i) => s + truth[i], 0)),
        );
        expect(oracle).toBe(value);
        expect(d.regret).toBeLessThanOrEqual(m.regret);
        for (const model of [m, d]) {
          expect(model.action.cost).toBeLessThanOrEqual(budget);
          expect(model.benefit).toBe(
            model.action.ids.reduce((s: number, i: number) => s + truth[i], 0),
          );
          expect(model.regret).toBe(value - model.benefit);
          expect(model.regret).toBeGreaterThanOrEqual(0);
        }
      }
      expect(results).toHaveLength(384);
    } finally {
      dom.window.close();
    }
  });

  it('independently verifies the inventory expectation and optimal whole-unit order', () => {
    const { demands, probabilities, underage_cost, overage_cost, order_costs } =
      reference.example.inventory;
    const cost = (q: number) =>
      demands.reduce(
        (sum: number, d: number, i: number) =>
          sum +
          probabilities[i] *
            (underage_cost * Math.max(d - q, 0) + overage_cost * Math.max(q - d, 0)),
        0,
      );
    for (const [q, value] of Object.entries(order_costs)) expect(cost(Number(q))).toBe(value);
    const orders = Array.from({ length: 11 }, (_, q) => q);
    expect(orders.reduce((a, b) => (cost(b) < cost(a) ? b : a))).toBe(8);
    expect(cost(8)).toBe(3);
    expect(cost(5)).toBe(9);
  });

  it('refits after edits, clears invalid input, handles zero outcomes, and resets', () => {
    const dom = openExample();
    try {
      const budget = dom.window.document.querySelector('#budget');
      budget.value = '3';
      budget.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '4 feasible subsets. Best true benefit: 10',
      );
      expect(dom.window.eval('fitted.decisionFit.theta')).toBe(0);
      const benefit = dom.window.document.querySelector('#benefit-a');
      benefit.value = '-1';
      benefit.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Enter whole observed benefits',
      );
      expect(dom.window.document.querySelectorAll('svg rect')).toHaveLength(0);
      expect(dom.window.document.querySelectorAll('#predictions tr')).toHaveLength(0);
      for (const id of ['a', 'b', 'c']) {
        const input = dom.window.document.querySelector('#benefit-' + id);
        input.value = '0';
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      }
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Best true benefit: 0',
      );
      expect(dom.window.document.querySelector('svg').innerHTML).not.toContain('NaN');
      dom.window.document.querySelector('#reset').click();
      expect(budget.value).toBe('4');
      expect(benefit.value).toBe('6');
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'MSE fit: 1; decision fit: 0',
      );
      expect(dom.window.document.querySelectorAll('#candidates tr')).toHaveLength(21);
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
    const article = corpus.entities.find((e) => e.id === 'ml-decision-focused-learning')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-decisions-and-feedback',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/decision-focused-learning.svg');
    expect(rendered).toContain('/assets/machine-learning/decision-focused-learning-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-decision-focused-learning.md'),
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

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
  resolve(root, 'content/assets/widgets/ml-hierarchical-forecast-reconciliation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-hierarchical-forecast-reconciliation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

type Matrix = number[][];
const S = [
    [1, 1, 1, 1],
    [1, 1, 0, 0],
    [0, 0, 1, 1],
    [1, 0, 0, 0],
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [0, 0, 0, 1],
  ],
  C = [
    [1, -1, -1, 0, 0, 0, 0],
    [0, 1, 0, -1, -1, 0, 0],
    [0, 0, 1, 0, 0, -1, -1],
  ],
  diagonals: Record<string, number[]> = {
    balanced: [4, 4, 4, 4, 4, 4, 4],
    aggregates: [1, 2, 2, 16, 16, 16, 16],
    leaves: [16, 8, 8, 1, 1, 1, 1],
  },
  factor = [2, 1, -1, 1, 1, -1, -1],
  dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0),
  mv = (a: Matrix, b: number[]) => a.map((row) => dot(row, b)),
  transpose = (a: Matrix) => a[0].map((_, i) => a.map((row) => row[i]));
// Cholesky solves a three-constraint system, independently of the widget's four-store pivoted solve.
const cholesky = (a: Matrix, b: number[]) => {
  const n = a.length,
    L = a.map(() => Array(n).fill(0)),
    z = Array(n).fill(0),
    x = Array(n).fill(0);
  for (let i = 0; i < n; i++)
    for (let j = 0; j <= i; j++) {
      const v = a[i][j] - L[i].slice(0, j).reduce((s, q, k) => s + q * L[j][k], 0);
      if (i === j) {
        expect(v).toBeGreaterThan(0);
        L[i][j] = Math.sqrt(v);
      } else L[i][j] = v / L[j][j];
    }
  for (let i = 0; i < n; i++) z[i] = (b[i] - dot(L[i], z)) / L[i][i];
  for (let i = n - 1; i >= 0; i--)
    x[i] = (z[i] - L.slice(i + 1).reduce((s, row, k) => s + row[i] * x[i + 1 + k], 0)) / L[i][i];
  return x;
};
// Closed-form Sherman–Morrison precision for the explicitly supplied diagonal-plus-factor model.
const precision = (method: string, profile: string, x: number[]) => {
  if (method === 'ols' || method === 'bottom') return [...x];
  const d = diagonals[profile],
    base = x.map((v, i) => v / d[i]);
  if (method !== 'covariance') return base;
  const ratio = dot(factor, base) / (1 + factor.reduce((s, v, i) => s + (v * v) / d[i], 0));
  return base.map((v, i) => v - (factor[i] / d[i]) * ratio);
};
const close = (actual: number[], expected: number[], digits = 9) =>
  actual.forEach((v, i) => expect(v).toBeCloseTo(expected[i], digits));
describe('Hierarchical Forecast Reconciliation', () => {
  it('reproduces every default forecast, gap, objective, and hypothetical-outcome metric', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report'),
        e = reference.example;
      expect(r.base).toEqual(e.base);
      close(r.reconciled, e.default_reconciled);
      expect(r.baseGaps).toEqual(e.base_gaps);
      close(r.afterGaps, [0, 0, 0]);
      expect(r.Q).toBeCloseTo(e.default_objective, 10);
      expect(r.afterMetrics.leafMAE).toBeCloseTo(e.default_leaf_mae, 10);
      expect(r.afterMetrics.allRMSE).toBeCloseTo(e.default_all_rmse, 10);
      expect(r.baseMetrics.allRMSE).toBeCloseTo(Math.sqrt(300 / 7), 10);
      expect(r.baseMetrics.leafMAE).toBe(0);
      expect(r.truth).toEqual([110, 60, 50, 30, 30, 20, 30]);
      close(
        get(dom, "compute('disagree','bottom','balanced','free').reconciled"),
        [110, 60, 50, 30, 30, 20, 30],
      );
    } finally {
      dom.window.close();
    }
  });
  it('independently verifies all 72 configurations with a constraint projection and global convex KKT conditions', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const fixture of ['disagree', 'coherent', 'negative'])
        for (const method of ['bottom', 'ols', 'diagonal', 'covariance'])
          for (const profile of ['balanced', 'aggregates', 'leaves'])
            for (const bounds of ['free', 'nonnegative']) {
              const r = get(dom, `compute('${fixture}','${method}','${profile}','${bounds}')`),
                p = (x: number[]) => precision(method, profile, x),
                expectedW = diagonals[profile].map((v, i) =>
                  diagonals[profile].map((_, j) =>
                    method === 'ols' || method === 'bottom'
                      ? Number(i === j)
                      : (i === j ? v : 0) + (method === 'covariance' ? factor[i] * factor[j] : 0),
                  ),
                );
              expect(r.W).toEqual(expectedW);
              close(mv(C, r.reconciled), [0, 0, 0]);
              close(mv(S, r.bottom), r.reconciled);
              const delta = r.reconciled.map((v: number, i: number) => v - r.base[i]),
                q = dot(delta, p(delta));
              expect(r.Q).toBeCloseTo(q, 8);
              if (method === 'bottom') expect(r.bottom).toEqual(r.base.slice(3));
              else {
                const WCt = transpose(C.map((c) => mv(expectedW, c))),
                  A = C.map((c) => transpose(WCt).map((col) => dot(c, col))),
                  multipliers = cholesky(A, mv(C, r.base)),
                  projected = r.base.map((v: number, i: number) => v - dot(WCt[i], multipliers));
                close(r.free, projected);
                if (bounds === 'free') close(r.reconciled, projected);
                const gradient = mv(transpose(S), p(delta));
                if (bounds === 'nonnegative') {
                  expect(r.faces).toBe(16);
                  r.bottom.forEach((v: number, i: number) => {
                    expect(v).toBeGreaterThanOrEqual(0);
                    if (v > 1e-8) expect(gradient[i]).toBeCloseTo(0, 8);
                    else expect(gradient[i]).toBeGreaterThanOrEqual(-1e-8);
                  });
                  const freeDelta = projected.map((v: number, i: number) => v - r.base[i]);
                  expect(q + 1e-8).toBeGreaterThanOrEqual(dot(freeDelta, p(freeDelta)));
                } else close(gradient, [0, 0, 0, 0], 8);
                const bottomDelta = mv(S, r.base.slice(3)).map(
                  (v: number, i: number) => v - r.base[i],
                );
                expect(q).toBeLessThanOrEqual(dot(bottomDelta, p(bottomDelta)) + 1e-8);
              }
              expect(r.truth).toEqual(mv(S, r.base.slice(3)));
              expect(r.afterMetrics.leafMAE).toBeCloseTo(
                r.bottom.reduce(
                  (s: number, v: number, i: number) => s + Math.abs(v - r.base[i + 3]),
                  0,
                ) / 4,
                10,
              );
              expect(r.afterMetrics.allRMSE).toBeCloseTo(
                Math.sqrt(
                  r.reconciled.reduce(
                    (s: number, v: number, i: number) => s + (v - r.truth[i]) ** 2,
                    0,
                  ) / 7,
                ),
                10,
              );
              if (fixture === 'coherent') close(r.reconciled, r.base);
              count++;
            }
      expect(count).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('preserves coherent vectors, is idempotent and scale invariant, and distinguishes correlated from diagonal errors', () => {
    const dom = openExample();
    try {
      for (const method of ['ols', 'diagonal', 'covariance'])
        for (const profile of ['balanced', 'aggregates', 'leaves']) {
          const r = get(dom, `compute('disagree','${method}','${profile}','free')`);
          close(
            get(
              dom,
              `mv(S,fit(${JSON.stringify(r.reconciled)},${JSON.stringify(r.W)},false).bottom)`,
            ),
            r.reconciled,
          );
          close(
            get(
              dom,
              `fit(${JSON.stringify(r.base)},${JSON.stringify(r.W.map((row: number[]) => row.map((v) => v * 100)))},false).bottom`,
            ),
            r.bottom,
          );
          for (let i = 0; i < 4; i++) {
            const y = S.map((row) => row[i]);
            close(
              get(dom, `mv(S,fit(${JSON.stringify(y)},${JSON.stringify(r.W)},false).bottom)`),
              y,
            );
          }
          for (const b of [
            [0, 0, 0, 0],
            [30, 30, 20, 30],
            [1, 100, 7, 4],
          ]) {
            const truth = mv(S, b),
              baseError = r.base.map((v: number, i: number) => v - truth[i]),
              afterError = r.reconciled.map((v: number, i: number) => v - truth[i]),
              p = (x: number[]) => precision(method, profile, x);
            expect(dot(afterError, p(afterError))).toBeLessThanOrEqual(
              dot(baseError, p(baseError)) + 1e-8,
            );
          }
        }
      expect(get(dom, "compute('disagree','diagonal','aggregates','free').reconciled")).not.toEqual(
        get(dom, "compute('disagree','covariance','aggregates','free').reconciled"),
      );
      for (const method of ['ols', 'bottom'])
        expect(get(dom, `compute('disagree','${method}','aggregates','free').reconciled`)).toEqual(
          get(dom, `compute('disagree','${method}','leaves','free').reconciled`),
        );
      expect(() => dom.window.eval('solve([[1,1],[1,1]],[1,2])')).toThrow('Singular system.');
    } finally {
      dom.window.close();
    }
  });
  it('separates nonnegative optimization from broken post-clipping and coherence from per-store improvement', () => {
    const dom = openExample();
    try {
      const free = get(dom, "compute('negative','ols','balanced','free')"),
        bounded = get(dom, "compute('negative','ols','balanced','nonnegative')");
      expect(free.base.every((v: number) => v >= 0)).toBe(true);
      close(free.bottom, [-71 / 7, 132 / 7, -71 / 7, 132 / 7]);
      close(free.clipGaps, [0, -71 / 7, -71 / 7]);
      close(bounded.reconciled, reference.example.nonnegative_reconciled);
      expect(bounded.Q).toBe(reference.example.nonnegative_objective);
      expect(bounded.active).toEqual([0, 2]);
      expect(bounded.Q).toBeGreaterThan(free.Q);
      close(bounded.afterGaps, [0, 0, 0]);
      const r = get(dom, 'report');
      expect(r.afterMetrics.leafMAE).toBeGreaterThan(r.baseMetrics.leafMAE);
      expect(r.afterMetrics.allRMSE).toBeLessThan(r.baseMetrics.allRMSE);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
      expect(source).toContain('not estimated from residuals');
    } finally {
      dom.window.close();
    }
  });
  it('updates each control and every diagnostic, resets expanded details, and renders the phone hierarchy', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      expect(d.querySelectorAll('#forecast-data tr')).toHaveLength(7);
      expect(d.querySelectorAll('#gap-data tr')).toHaveLength(3);
      expect(d.querySelectorAll('#outcome-data tr')).toHaveLength(2);
      change('#fixture', 'negative');
      expect(d.querySelector('output')!.textContent).toContain('Negative stores 2');
      change('#bounds', 'nonnegative');
      expect(d.querySelector('output')!.textContent).toContain('Total 22.5000');
      change('#method', 'covariance');
      change('#profile', 'aggregates');
      expect(get(dom, '[report.fixture,report.method,report.profile,report.bounds]')).toEqual([
        'negative',
        'covariance',
        'aggregates',
        'nonnegative',
      ]);
      for (const id of ['#constraints', '#weights', '#outcome'])
        (d.querySelector(id) as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(d.querySelectorAll('details[open]')).toHaveLength(0);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 1000');
    } finally {
      dom.window.close();
    }
  });
  it('integrates the illustrated article, recommendation metadata, and exact structure without a practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find(
      (e) => e.id === 'ml-hierarchical-forecast-reconciliation',
    )!;
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
    expect(rendered).toContain('/assets/machine-learning/hierarchical-forecast-reconciliation.svg');
    expect(rendered).toContain(
      '/assets/machine-learning/hierarchical-forecast-reconciliation-mobile.svg',
    );
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-hierarchical-forecast-reconciliation.md'),
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
    expect(reference.sources).toHaveLength(6);
    expect(reference.example_user_queries).toHaveLength(12);
  });
});

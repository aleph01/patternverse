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
  resolve(root, 'content/assets/widgets/ml-class-rebalancing.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-class-rebalancing');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Class Rebalancing weighted fitting and sampling', () => {
  it('fits the worked scores and class masses and counts decisions on original records', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'groups')).toEqual(reference.example.groups);
      expect(read(dom, 'records.length')).toBe(1000);
      expect(read(dom, 'new Set(records.map(r=>r.id)).size')).toBe(1000);
      expect(read(dom, 'report.plain')).toEqual(reference.example.unweighted_scores);
      expect(read(dom, 'report.weighted')).toEqual(reference.example.weighted_scores);
      expect(read(dom, 'report.original')).toMatchObject(reference.example.unweighted_confusion);
      expect(read(dom, 'report.selected')).toMatchObject(reference.example.weighted_confusion);
      expect(read(dom, 'report.original.precision')).toBeCloseTo(70 / 79, 14);
      expect(read(dom, 'report.selected.precision')).toBe(0.5);
      expect(read(dom, 'report.original.accuracy')).toBe(0.961);
      expect(read(dom, 'report.selected.accuracy')).toBe(0.9);
      expect(read(dom, 'report.ordinaryMass')).toBe(900);
      expect(read(dom, 'report.defectMass')).toBe(900);
      const b = reference.example.balanced_weights;
      expect(900 * b.ordinary).toBe(500);
      expect(100 * b.defect).toBe(500);
      expect(900 + 9 * 100).toBe(reference.example.repeated_appearances);
      expect(100 + 100).toBe(reference.example.undersampled_appearances);
    } finally {
      dom.window.close();
    }
  });
  it('verifies exact log-loss optima independently and preserves the weight-ratio and score-order relationships', () => {
    const dom = openExample();
    try {
      const gs = reference.example.groups as { ordinary: number; defects: number }[];
      for (const r of reference.example.weights) {
        const q = read(dom, `fit(records,${r})`),
          p = reference.example.unweighted_scores;
        const objective = (scores: number[]) =>
          gs.reduce(
            (sum, g, i) =>
              sum - g.ordinary * Math.log1p(-scores[i]) - r * g.defects * Math.log(scores[i]),
            0,
          ) /
          (900 + 100 * r);
        expect(read(dom, `logLoss(records,fit(records,${r}),${r})`)).toBeCloseTo(objective(q), 12);
        for (let i = 0; i < 3; i++) {
          const eps = 1e-6,
            plus = q.slice(),
            minus = q.slice();
          plus[i] += eps;
          minus[i] -= eps;
          expect((objective(plus) - objective(minus)) / (2 * eps)).toBeCloseTo(0, 5);
          expect(objective(plus)).toBeGreaterThan(objective(q));
          expect(objective(minus)).toBeGreaterThan(objective(q));
          expect(q[i] / (1 - q[i])).toBeCloseTo((r * p[i]) / (1 - p[i]), 10);
          if (i) expect(q[i]).toBeGreaterThan(q[i - 1]);
        }
        expect(objective(q)).toBeLessThanOrEqual(objective(p) + 1e-12);
      }
      expect(() => dom.window.eval('fit(records,0)')).toThrow('Weight must be positive');
    } finally {
      dom.window.close();
    }
  });
  it('constructs repeated records and obtains the same normalized objective without increasing unique evidence', () => {
    const dom = openExample();
    try {
      for (const r of reference.example.weights) {
        const expanded = read(dom, `repeatPositives(records,${r})`) as { id: string; y: number }[];
        const counts = new Map<string, number>();
        for (const row of expanded) counts.set(row.id, (counts.get(row.id) || 0) + 1);
        expect(expanded).toHaveLength(900 + 100 * r);
        expect(counts.size).toBe(1000);
        expect(expanded.filter((x) => x.y === 0)).toHaveLength(900);
        expect(expanded.filter((x) => x.y === 1)).toHaveLength(100 * r);
        const originals = read(dom, 'records') as { id: string; y: number }[];
        for (const row of originals) expect(counts.get(row.id)).toBe(row.y ? r : 1);
        expect(read(dom, `fit(repeatPositives(records,${r}),1)`)).toEqual(
          read(dom, `fit(records,${r})`),
        );
        expect(read(dom, `logLoss(repeatPositives(records,${r}),fit(records,${r}),1)`)).toBeCloseTo(
          read(dom, `logLoss(records,fit(records,${r}),${r})`),
          12,
        );
      }
      expect(() => dom.window.eval('repeatPositives(records,1.5)')).toThrow('Positive integer');
      expect(read(dom, 'records.length')).toBe(1000);
    } finally {
      dom.window.close();
    }
  });
  it('checks all twenty settings against independent group-level confusion counts and handles no flags', () => {
    const dom = openExample();
    try {
      const gs = reference.example.groups as { ordinary: number; defects: number }[];
      for (const r of reference.example.weights)
        for (const t of reference.example.thresholds) {
          const report = read(dom, `buildReport(${r},${t})`);
          for (const [key, ratio] of [
            ['original', 1],
            ['selected', r],
          ] as const) {
            let tp = 0,
              fp = 0;
            for (const g of gs) {
              if (ratio * g.defects >= (g.ordinary + ratio * g.defects) * t) {
                tp += g.defects;
                fp += g.ordinary;
              }
            }
            expect(report[key]).toMatchObject({
              tp,
              fp,
              tn: 900 - fp,
              fn: 100 - tp,
              recall: tp / 100,
              precision: tp + fp ? tp / (tp + fp) : null,
              accuracy: (tp + 900 - fp) / 1000,
            });
          }
          expect(report.unique).toBe(1000);
        }
      expect(read(dom, 'buildReport(9,0.9).selected')).toEqual(
        read(dom, 'buildReport(1,0.5).selected'),
      );
      expect(read(dom, 'metrics(records,[0.5,0.5,0.5],0.5).tp')).toBe(100);
      expect(read(dom, 'buildReport(9,1).selected.precision')).toBeNull();
      expect(() => dom.window.eval('buildReport(2,0.5)')).toThrow('Unsupported setting');
    } finally {
      dom.window.close();
    }
  });
  it('refits only for weight changes, keeps original records fixed and resets both controls and explanations', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        before = dom.window.eval('JSON.stringify(records)');
      const change = (id: string, value: string) => {
        const s = d.querySelector(id) as HTMLSelectElement;
        s.value = value;
        s.dispatchEvent(new dom.window.Event('change'));
      };
      const q = read(dom, 'report.weighted');
      change('#threshold', '0.9');
      expect(read(dom, 'report.weighted')).toEqual(q);
      expect(read(dom, 'report.selected.fp')).toBe(9);
      change('#weight', '1');
      expect(read(dom, 'report.weighted')).toEqual(reference.example.unweighted_scores);
      expect(d.querySelector('output')!.textContent).toContain('precision N/A');
      expect(dom.window.eval('JSON.stringify(records)')).toBe(before);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 820');
      for (const detail of d.querySelectorAll('details'))
        (detail as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report.weight')).toBe(9);
      expect(read(dom, 'report.threshold')).toBe(0.5);
      expect(read(dom, 'report.weighted')).toEqual(reference.example.weighted_scores);
      for (const detail of d.querySelectorAll('details'))
        expect((detail as HTMLDetailsElement).open).toBe(false);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-class-rebalancing')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-learning-and-adaptation',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/class-rebalancing.svg');
    expect(rendered).toContain('/assets/machine-learning/class-rebalancing-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-class-rebalancing.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/class-rebalancing' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('0.198 → 0.690');
    }
  });
});

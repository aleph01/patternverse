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
  resolve(root, 'content/assets/widgets/ml-selective-prediction.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-selective-prediction');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Selective Prediction worked example', () => {
  it('derives the documented default counts and costs from predictions and labels', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.rows.map((x: { score: number }) => x.score)).toEqual(reference.example.scores);
      expect(r.rows.map((x: { error: boolean }) => !x.error)).toEqual(reference.example.correct);
      expect([
        r.accepted,
        r.errors,
        r.deferred,
        r.coverage,
        r.risk,
        r.fullReviewCost,
        r.overCapacity,
      ]).toEqual([8, 2, 4, 8 / 12, 2 / 8, 28, 0]);
      expect(
        r.summary.map((g: { accepted: number; n: number; errors: number }) => [
          g.accepted,
          g.n,
          g.errors,
        ]),
      ).toEqual([
        [8, 12, 2],
        [6, 8, 0],
        [2, 4, 2],
      ]);
      expect(new Set(r.rows.map((x: { id: string }) => x.id)).size).toBe(12);
      expect(
        r.rows
          .filter((x: { accepted: boolean; score: number }) => x.score === 0.8)
          .every((x: { accepted: boolean }) => x.accepted),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all thresholds, outcome scenarios, costs, and capacities', () => {
    const dom = openExample();
    try {
      const results = get(
        dom,
        `(()=>{const out=[];for(const threshold of thresholds)for(const scenario of ['baseline','harder'])for(let cost=0;cost<=10;cost++)for(let capacity=0;capacity<=12;capacity++){const r=buildReport(threshold,scenario,cost,capacity);out.push({threshold,scenario,cost,capacity,accepted:r.accepted,errors:r.errors,risk:r.risk,fullReviewCost:r.fullReviewCost,overCapacity:r.overCapacity});}return out;})()`,
      );
      const counts: Record<string, [number, number]> = {
        '0': [12, 5],
        '0.6': [11, 4],
        '0.7': [10, 3],
        '0.75': [9, 3],
        '0.8': [8, 2],
        '0.85': [6, 1],
        '0.9': [5, 1],
        '0.95': [3, 1],
        '0.97': [2, 0],
        '1': [0, 0],
      };
      for (const r of results) {
        const [a, e] = counts[String(r.threshold)],
          errors = e + (r.scenario === 'harder' && a > 0 ? 2 : 0);
        expect(r.accepted).toBe(a);
        expect(r.errors).toBe(errors);
        expect(r.risk).toBe(a ? errors / a : null);
        expect(r.fullReviewCost).toBe(errors * 10 + (12 - a) * r.cost);
        expect(r.overCapacity).toBe(Math.max(0, 12 - a - r.capacity));
      }
      expect(results).toHaveLength(2860);
    } finally {
      dom.window.close();
    }
  });
  it('preserves ties and score ordering, exposes nonmonotone risk, and leaves empty risk undefined', () => {
    const dom = openExample();
    try {
      expect(get(dom, 'measure(makeRecords("baseline"),.9).risk')).toBe(0.2);
      expect(get(dom, 'measure(makeRecords("baseline"),.95).risk')).toBe(1 / 3);
      expect(get(dom, 'measure(makeRecords("baseline"),.97).risk')).toBe(0);
      const empty = get(dom, 'buildReport(1,"baseline",2,4)');
      expect([
        empty.coverage,
        empty.risk,
        empty.accepted,
        empty.fullReviewCost,
        empty.overCapacity,
      ]).toEqual([0, null, 0, 24, 8]);
      expect(get(dom, 'summarize([])').every((x: { risk: null }) => x.risk === null)).toBe(true);
      const baseline = get(dom, 'curvePoints(makeRecords("baseline"))'),
        harder = get(dom, 'curvePoints(makeRecords("harder"))');
      expect(baseline.map((x: { coverage: number }) => x.coverage)).toEqual(
        harder.map((x: { coverage: number }) => x.coverage),
      );
      expect(get(dom, 'buildReport(.8,"harder",2,4).errors')).toBe(4);
      expect(get(dom, 'measure([...makeRecords("baseline")].reverse(),.8).risk')).toBe(0.25);
      expect(get(dom, 'measure(makeRecords("baseline"),.80001).accepted')).toBe(6);
      expect(get(dom, 'measure(makeRecords("baseline"),.8).accepted')).toBe(8);
      expect(get(dom, 'buildReport(.9,"baseline",6,4).fullReviewCost')).toBe(52);
    } finally {
      dom.window.close();
    }
  });
  it('computes curve points consistently and checks every empirical selective-risk denominator', () => {
    const dom = openExample();
    try {
      const curve = get(dom, 'report.curve');
      expect(curve).toHaveLength(10);
      for (const p of curve) {
        const accepted = p.rows.filter((x: { accepted: boolean }) => x.accepted);
        const errors = accepted.filter((x: { error: boolean }) => x.error);
        expect(p.coverage).toBe(accepted.length / 12);
        expect(p.risk).toBe(accepted.length ? errors.length / accepted.length : null);
      }
      expect(
        curve
          .slice(1)
          .every((x: { accepted: number }, i: number) => x.accepted <= curve[i].accepted),
      ).toBe(true);
      expect(curve.at(-1).risk).toBeNull();
    } finally {
      dom.window.close();
    }
  });
  it('renders edge cases, clears invalid input, and resets all controls across widths', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLInputElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
        };
      change('#threshold', '1');
      expect(d.querySelector('output')!.textContent).toContain('0/0 (undefined)');
      expect(d.querySelector('#curve')!.textContent).toContain('risk undefined');
      expect(d.querySelector('#interpretation')!.textContent).toContain('exceeds capacity by 8');
      change('#reviewCost', '-1');
      expect(d.querySelector('output')!.textContent).toContain('whole costs');
      expect(d.querySelector('#data')!.children).toHaveLength(0);
      expect(d.querySelector('#mechanism')!.innerHTML).toBe('');
      change('#reviewCost', '2.5');
      expect(d.querySelector('output')!.textContent).toContain('whole costs');
      change('#reviewCost', '10');
      change('#capacity', '13');
      expect(d.querySelector('output')!.textContent).toContain('whole costs');
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(get(dom, 'report.fullReviewCost')).toBe(28);
      expect(d.querySelectorAll('#data tr')).toHaveLength(12);
      expect((d.querySelector('#threshold') as HTMLSelectElement).value).toBe('0.8');
      expect((d.querySelector('#capacity') as HTMLInputElement).value).toBe('4');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 532');
      expect(d.querySelector('#curve')!.getAttribute('viewBox')).toBe('0 0 328 300');
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
    const article = corpus.entities.find((e) => e.id === 'ml-selective-prediction')!;
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
    expect(rendered).toContain('/assets/machine-learning/selective-prediction.svg');
    expect(rendered).toContain('/assets/machine-learning/selective-prediction-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-selective-prediction.md'), 'utf8');
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
    expect(reference.sources).toHaveLength(5);
    expect(reference.example_user_queries).toHaveLength(12);
  });
});

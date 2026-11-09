// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const html = readFileSync(
  resolve(root, 'content/assets/widgets/ml-heuristic-benchmark.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-heuristic-benchmark');
const openExample = () => new JSDOM(html, { runScripts: 'dangerously' });

function readValue(dom: JSDOM, expression: string) {
  return JSON.parse(dom.window.eval('JSON.stringify(' + expression + ')'));
}

describe('Heuristic Benchmark worked comparison', () => {
  it('scores all 20 fixed records and makes the more-accurate, more-costly distinction explicit', () => {
    const dom = openExample();
    try {
      const records = readValue(dom, 'records');
      expect(
        records.map((r: { behind: number; late: number; score: number }) => [
          r.behind,
          r.late,
          r.score,
        ]),
      ).toEqual(reference.example.records);
      expect(new Set(records.map((r: { id: string }) => r.id)).size).toBe(20);
      const result = readValue(dom, 'report');
      for (const key of ['constant', 'rule', 'candidate'])
        expect(result.policies[key]).toMatchObject(reference.example.default[key]);
      expect(result.reference.accuracy).toBe(0.85);
      expect(result.candidate.accuracy).toBe(0.9);
      expect(result.candidate.cost - result.reference.cost).toBe(3);
      expect(dom.window.document.querySelector('#interpretation')!.textContent).toContain(
        '3 more assigned units',
      );
      expect(dom.window.document.querySelectorAll('#records tbody tr')).toHaveLength(20);
    } finally {
      dom.window.close();
    }
  });

  it('matches independent count references across every one of the 40 supported configurations', () => {
    const dom = openExample();
    try {
      // Counts are hand-derived from the six nontrivial records; remaining 14
      // records are negative under every candidate threshold offered by the UI.
      const expected: Record<string, number[]> = {
        '0.3': [18, 4, 0, 2],
        '0.45': [19, 3, 1, 0],
        '0.5': [18, 2, 2, 0],
        '0.9': [17, 1, 3, 0],
      };
      for (const baseline of ['rule', 'constant'])
        for (const threshold of [0.3, 0.45, 0.5, 0.9])
          for (const cost of [0, 1, 2, 5, 10]) {
            const r = readValue(dom, `computeReport('${baseline}',${threshold},${cost})`);
            const [correct, caught, missed, falseAlerts] = expected[String(threshold)];
            expect(r.candidate).toMatchObject({
              n: 20,
              correct,
              caught,
              missed,
              falseAlerts,
              accuracy: correct / 20,
              cost: missed * cost + falseAlerts,
            });
            expect(r.reference).toMatchObject(
              baseline === 'rule'
                ? { correct: 17, missed: 1, falseAlerts: 2, cost: cost + 2 }
                : { correct: 16, missed: 4, falseAlerts: 0, cost: 4 * cost },
            );
            expect(r.candidate.caught + r.candidate.missed).toBe(4);
          }
      expect(readValue(dom, "computeReport('rule',.5,2)").reference.cost).toBe(4);
      expect(readValue(dom, "computeReport('rule',.5,2)").candidate.cost).toBe(4);
    } finally {
      dom.window.close();
    }
  });

  it('keeps predictions independent of penalties and handles zero cost and absent evaluation evidence', () => {
    const dom = openExample();
    try {
      const low = readValue(dom, "computeReport('constant',.5,0)");
      const high = readValue(dom, "computeReport('constant',.5,10)");
      for (const key of ['constant', 'rule', 'candidate']) {
        const { cost: ignoredLow, ...a } = low.policies[key],
          { cost: ignoredHigh, ...b } = high.policies[key];
        expect(ignoredLow).toBeGreaterThanOrEqual(0);
        expect(ignoredHigh).toBeGreaterThanOrEqual(0);
        expect(a).toEqual(b);
      }
      expect(low.reference.cost).toBe(0);
      expect(low.candidate.cost).toBe(0);
      expect(dom.window.eval("comparisonGraphic(computeReport('constant',.5,0),true)")).not.toMatch(
        /NaN|Infinity|undefined/,
      );
      expect(readValue(dom, 'evaluatePolicy([],()=>false,5)')).toMatchObject({
        n: 0,
        accuracy: null,
        cost: 0,
      });
      expect(() => dom.window.eval("computeReport('rule',.4,5)")).toThrow('Unsupported setting');
    } finally {
      dom.window.close();
    }
  });

  it('uses inclusive score thresholds, a strict route threshold, and resets controls and optional detail', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        original = dom.window.eval('JSON.stringify(records)');
      const change = (id: string, value: string) => {
        const input = d.querySelector(id) as HTMLSelectElement;
        input.value = value;
        input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      change('#threshold', '0.30');
      expect(d.querySelector('output')!.textContent).toContain(
        'Candidate: 18/20 correct, 2 cost units.',
      );
      expect([...d.querySelectorAll('#records tbody tr')][5].textContent).toContain('Alert');
      expect([...d.querySelectorAll('#records tbody tr')][6].textContent).toContain('No alert');
      change('#miss-cost', '2');
      change('#threshold', '0.50');
      expect(d.querySelector('#interpretation')!.textContent).toContain('costs tie');
      change('#baseline', 'constant');
      (d.querySelector('#data') as HTMLDetailsElement).open = true;
      (d.querySelector('#assumptions') as HTMLDetailsElement).open = true;
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 710');
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(
        'Reference: 17/20 correct, 7 cost units. Candidate: 18/20 correct, 10 cost units.',
      );
      expect((d.querySelector('#data') as HTMLDetailsElement).open).toBe(false);
      expect((d.querySelector('#assumptions') as HTMLDetailsElement).open).toBe(false);
      expect(dom.window.eval('JSON.stringify(records)')).toBe(original);
    } finally {
      dom.window.close();
    }
  });

  it('checks forecasting errors and all reference inputs independently', () => {
    const f = reference.example.forecast;
    expect(f.past_week.reduce((sum: number, n: number) => sum + n, 0) / 4).toBe(115);
    const mae = (values: number[]) =>
      values.reduce((sum, n, i) => sum + Math.abs(n - f.actual[i]), 0) / 4;
    expect(mae(f.past_week)).toBe(4);
    expect(mae(f.candidate)).toBe(2.5);
    expect(mae([115, 115, 115, 115])).toBe(6);
    expect([f.seasonal_mae, f.candidate_mae, f.mean_mae]).toEqual([4, 2.5, 6]);
  });

  it('integrates the ten-section article, original responsive figures, explorer and recommendation metadata', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const entity = corpus.entities.find((e) => e.id === 'ml-heuristic-benchmark')!;
    expect(entity).toBeDefined();
    expect(entity.type).toBe('pattern');
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-evaluation-and-uncertainty',
    });
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/heuristic-benchmark.svg');
    expect(rendered).toContain('/assets/machine-learning/heuristic-benchmark-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const article = readFileSync(
      resolve(root, 'content/patterns/ml-heuristic-benchmark.md'),
      'utf8',
    );
    expect([...article.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(
      metadata.article_structure,
    );
    const words = article
      .replace(/^---\n[\s\S]*?\n---\n/, '')
      .split('## Sources and further reading')[0]
      .split(/\s+/)
      .filter(Boolean).length;
    expect(words).toBe(reference.article_words);
    expect(words).toBeGreaterThanOrEqual(800);
    expect(words).toBeLessThanOrEqual(1500);
    expect(article).not.toContain('patternverse-language');
    for (const url of reference.sources) expect(article).toContain(url);
    expect(reference.example_user_queries.length).toBeGreaterThanOrEqual(8);
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/heuristic-benchmark' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('17 of 20 right and costs 7');
      expect(svg).toContain('18 right but costs 10');
    }
  });
});

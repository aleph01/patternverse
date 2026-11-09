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
  resolve(root, 'content/assets/widgets/ml-slice-based-evaluation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-slice-based-evaluation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Slice-Based Evaluation worked example', () => {
  it('computes exact overall and device results from the 20 fixed records', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
      const rows = JSON.parse(dom.window.eval('JSON.stringify(records)'));
      expect(rows).toHaveLength(20);
      expect(new Set(rows.map((r: { id: string }) => r.id)).size).toBe(20);
      expect(rows.filter((r: { label: number }) => r.label === 1)).toHaveLength(10);
      for (const key of ['a', 'b']) {
        const expected = reference.example.overall[key],
          actual = result.overall[key];
        expect([actual.tp, actual.tn, actual.fp, actual.fn]).toEqual([
          expected.tp,
          expected.tn,
          expected.fp,
          expected.fn,
        ]);
        expect(actual.k).toBe(expected.correct);
        expect(actual.n).toBe(20);
      }
      for (const slice of result.slices) {
        const expected = reference.example.device[slice.label];
        expect(slice.rows).toBe(expected.rows);
        for (const key of ['a', 'b']) {
          expect(slice[key].n).toBe(expected.rows);
          if (expected.rows) expect(slice[key].k).toBe(expected[key + '_correct']);
          else {
            expect(slice[key].rate).toBeNull();
            expect(slice[key].interval).toBeNull();
          }
        }
      }
      expect(result.slices[0].b.rate).toBeLessThan(result.slices[0].a.rate);
      expect(result.overall.b.rate).toBeGreaterThan(result.overall.a.rate);
    } finally {
      dom.window.close();
    }
  });

  it('matches independently combined cell counts across all 32 view, metric, and display choices', () => {
    const dom = openExample();
    try {
      const results = JSON.parse(
        dom.window.eval(
          `JSON.stringify(['device','language','intersection','overlap'].flatMap(view=>['accuracy','recall'].flatMap(metric=>[0,3,5,25].map(minimum=>({view,metric,minimum,result:buildReport(view,metric,minimum)})))))`,
        ),
      );
      const groups: Record<string, Array<[string, number[]]>> = {
        device: [
          ['Desktop', [0, 1]],
          ['Mobile', [2, 3]],
          ['Tablet', []],
        ],
        language: [
          ['English', [0, 2]],
          ['Spanish', [1, 3]],
        ],
        intersection: [
          ['Desktop · English', [0]],
          ['Desktop · Spanish', [1]],
          ['Mobile · English', [2]],
          ['Mobile · Spanish', [3]],
          ['Tablet · English', []],
          ['Tablet · Spanish', []],
        ],
        overlap: [
          ['Mobile', [2, 3]],
          ['Spanish', [1, 3]],
          ['Mobile · Spanish', [3]],
        ],
      };
      for (const { view, metric, minimum, result } of results) {
        const expectedGroups = groups[view].filter(
          ([, indices]) =>
            indices.reduce((sum, i) => sum + reference.example.cells[i].rows, 0) >= minimum,
        );
        expect(result.slices.map((s: { label: string }) => s.label)).toEqual(
          expectedGroups.map(([label]) => label),
        );
        expect(result.hidden).toBe(groups[view].length - expectedGroups.length);
        for (const [label, indices] of [['Overall', [0, 1, 2, 3]], ...expectedGroups] as Array<
          [string, number[]]
        >) {
          const actual =
            label === 'Overall'
              ? result.overall
              : result.slices.find((s: { label: string }) => s.label === label);
          for (const key of ['a', 'b']) {
            const sums = [0, 1, 2, 3].map((j) =>
              indices.reduce((sum, i) => sum + reference.example.cells[i][key][j], 0),
            );
            const [tp, tn, fp, fn] = sums,
              n = metric === 'recall' ? tp + fn : tp + tn + fp + fn,
              k = metric === 'recall' ? tp : tp + tn;
            expect([actual[key].tp, actual[key].tn, actual[key].fp, actual[key].fn]).toEqual(sums);
            expect(actual[key].k).toBe(k);
            expect(actual[key].n).toBe(n);
            expect(actual[key].rate).toBe(n ? k / n : null);
          }
        }
        expect(result.memberships).toBe(
          result.slices.reduce((sum: number, s: { rows: number }) => sum + s.rows, 0),
        );
        expect(result.unique).toBe(
          new Set(result.slices.flatMap((s: { ids: string[] }) => s.ids)).size,
        );
        expect(result.overall.a.n).toBe(metric === 'recall' ? 10 : 20);
      }
      expect(results).toHaveLength(32);
    } finally {
      dom.window.close();
    }
  });

  it('checks Wilson endpoints independently against the score equation for all 230 count pairs', () => {
    const dom = openExample();
    try {
      const cases = JSON.parse(
        dom.window.eval(
          `JSON.stringify(Array.from({length:20},(_,i)=>i+1).flatMap(n=>Array.from({length:n+1},(_,k)=>({k,n,interval:wilson(k,n),complement:wilson(n-k,n)}))))`,
        ),
      );
      const z2 = 1.96 ** 2;
      for (const {
        k,
        n,
        interval: [lo, hi],
        complement: [clo, chi],
      } of cases) {
        expect(lo).toBeGreaterThanOrEqual(0);
        expect(hi).toBeLessThanOrEqual(1);
        expect(lo).toBeLessThanOrEqual(k / n + 1e-12);
        expect(hi).toBeGreaterThanOrEqual(k / n - 1e-12);
        for (const endpoint of [lo, hi])
          expect((k - n * endpoint) ** 2).toBeCloseTo(z2 * n * endpoint * (1 - endpoint), 8);
        expect(lo).toBeCloseTo(1 - chi, 12);
        expect(hi).toBeCloseTo(1 - clo, 12);
      }
      expect(cases).toHaveLength(230);
      expect(dom.window.eval('wilson(1,1)[0]')).toBeCloseTo(
        reference.example.mobile_spanish_wilson_lower,
        12,
      );
      expect(dom.window.eval('wilson(0,0)')).toBeNull();
    } finally {
      dom.window.close();
    }
  });

  it('distinguishes overlap, missing evidence, zero-positive recall, and weighting arithmetic', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('buildReport("overlap","accuracy",0).memberships')).toBe(10);
      expect(dom.window.eval('buildReport("overlap","accuracy",0).unique')).toBe(8);
      expect(dom.window.eval('buildReport("overlap","accuracy",3).memberships')).toBe(9);
      expect(dom.window.eval('buildReport("overlap","accuracy",3).unique')).toBe(8);
      expect(dom.window.eval('evaluate([{label:0,a:0}],"a","recall").rate')).toBeNull();
      expect(dom.window.eval('evaluate([{label:0,a:0}],"a","accuracy").rate')).toBe(1);
      expect(dom.window.eval('evaluate([],"a","accuracy").n')).toBe(0);
      expect(0.5 * (14 / 16) + 0.5 * (2 / 4)).toBe(reference.example.device_macro_accuracy_a);
      expect(0.8 * (14 / 16) + 0.2 * (2 / 4)).toBe(0.8);
      expect(dom.window.eval('buildReport("device","recall",0).slices[0].a.rate')).toBe(0.75);
      expect(dom.window.eval('buildReport("device","recall",0).slices[0].b.rate')).toBe(0.75);
    } finally {
      dom.window.close();
    }
  });

  it('keeps the overall result after filters, handles an empty display, resizes, and resets', () => {
    const dom = openExample();
    try {
      const document = dom.window.document;
      const change = (id: string, value: string) => {
        const el = document.querySelector('#' + id);
        el.value = value;
        el.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      const initial = document.querySelector('output').textContent;
      change('view', 'overlap');
      expect(document.querySelector('#coverage').textContent).toContain(
        '10 memberships across 8 distinct records',
      );
      change('minimum', '3');
      expect(document.querySelector('#coverage').textContent).toContain(
        '9 memberships across 8 distinct records',
      );
      change('metric', 'recall');
      expect(document.querySelector('output').textContent).toContain(
        'A 7/10 = 70.0%; B 8/10 = 80.0%',
      );
      change('minimum', '25');
      expect(document.querySelector('output').textContent).toContain('0/3 slices shown; 3 hidden');
      expect(document.querySelector('svg').textContent).toContain(
        'No slices meet this display filter',
      );
      expect(document.querySelectorAll('#metrics tr')).toHaveLength(1);
      expect(document.querySelectorAll('#data tr')).toHaveLength(20);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(document.querySelector('svg').getAttribute('viewBox')).toBe('0 0 328 80');
      document.querySelector('#reset').click();
      expect(document.querySelector('output').textContent).toBe(initial);
      expect(document.querySelector('#view').value).toBe('device');
      expect(document.querySelector('#metric').value).toBe('accuracy');
      expect(document.querySelector('#minimum').value).toBe('0');
      expect(document.querySelector('svg').getAttribute('viewBox')).toBe('0 0 328 510');
      expect(document.querySelectorAll('#metrics tr')).toHaveLength(4);
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
    const article = corpus.entities.find((e) => e.id === 'ml-slice-based-evaluation')!;
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
    expect(rendered).toContain('/assets/machine-learning/slice-based-evaluation.svg');
    expect(rendered).toContain('/assets/machine-learning/slice-based-evaluation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-slice-based-evaluation.md'), 'utf8');
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

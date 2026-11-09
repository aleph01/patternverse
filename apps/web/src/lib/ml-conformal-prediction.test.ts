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
  resolve(root, 'content/assets/widgets/ml-conformal-prediction.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-conformal-prediction');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Conformal Prediction worked example', () => {
  it('derives the documented residuals, interval, and distinct evaluation coverage', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(dom.window.eval('JSON.stringify(report)'));
      expect(
        result.calibration.map((r: { prediction: number; outcome: number }) =>
          Math.abs(r.outcome - r.prediction),
        ),
      ).toEqual(reference.example.calibration_errors);
      expect(result.fit.scores).toEqual(reference.example.sorted_errors);
      expect(result.fit.k).toBe(reference.example.default_rank);
      expect(result.fit.q).toBe(reference.example.default_radius);
      expect([result.next.lower, result.next.upper]).toEqual(reference.example.default_interval);
      expect(result.next.width).toBe(reference.example.default_width);
      for (const s of result.summary)
        expect([s.covered, s.n]).toEqual(reference.example.default_summary[s.group]);
      expect(
        new Set([...result.calibration, ...result.rows].map((r: { id: string }) => r.id)).size,
      ).toBe(19);
      expect(result.rows[8].covered).toBe(true);
      expect(result.rows[9].covered).toBe(false);
      expect(dom.window.eval('buildReport(9,80,"baseline",40).fit.q')).toBe(7);
      expect(dom.window.eval('buildReport(9,80,"baseline",40).summary[0].covered')).toBe(7);
      expect(dom.window.eval('buildReport(9,95,"baseline",40).fit.q')).toBe(Infinity);
      expect(dom.window.eval('buildReport(9,95,"baseline",40).next.lower')).toBe(-Infinity);
      expect(dom.window.eval('buildReport(9,95,"baseline",40).summary[0].covered')).toBe(10);
    } finally {
      dom.window.close();
    }
  });

  it('exhaustively verifies corrected-rank coverage over distinct and tied leave-one-out score pools', () => {
    const dom = openExample();
    try {
      const results = JSON.parse(
        dom.window.eval(
          `JSON.stringify((()=>{const out=[];for(let n=1;n<=20;n++)for(let target=1;target<100;target++)for(const kind of ['distinct','tied']){const pool=Array.from({length:n+1},(_,i)=>kind==='distinct'?i:Math.floor(i/3));let covered=0;pool.forEach((score,i)=>{const fit=threshold(pool.filter((_,j)=>j!==i),target);covered+=Number(score<=fit.q);});out.push({n,target,kind,covered});}return out;})())`,
        ),
      );
      for (const { n, target, kind, covered } of results) {
        const k = Math.ceil(((n + 1) * target) / 100);
        if (kind === 'distinct') expect(covered).toBe(Math.min(k, n + 1));
        else expect(covered).toBeGreaterThanOrEqual(Math.min(k, n + 1));
        expect(covered / (n + 1)).toBeGreaterThanOrEqual(target / 100 - 1e-12);
      }
      expect(results).toHaveLength(3960);
      // Capping a missing order statistic at the maximum supports only 9/10 here.
      expect(9 / 10).toBeLessThan(0.95);
      expect(dom.window.eval('threshold([1,2,3,4,5,6,7,8,9],95).q')).toBe(Infinity);
    } finally {
      dom.window.close();
    }
  });

  it('matches independent order-statistic and coverage counts for all 30 offered calibration/evaluation choices', () => {
    const dom = openExample();
    try {
      const cases = JSON.parse(
        dom.window.eval(
          `JSON.stringify([3,5,9].flatMap(size=>[60,70,80,90,95].flatMap(target=>['baseline','harder'].map(scenario=>({size,target,scenario,result:buildReport(size,target,scenario,40)})))),(key,value)=>typeof value==='number'&&!Number.isFinite(value)?String(value):value)`,
        ),
      );
      const radii: Record<number, number[]> = {
        3: [7, 7, Infinity, Infinity, Infinity],
        5: [7, 9, 9, Infinity, Infinity],
        9: [4, 5, 7, 9, Infinity],
      };
      for (const { size, target, scenario, result } of cases) {
        const q = radii[size][[60, 70, 80, 90, 95].indexOf(target)];
        expect(result.fit.q).toBe(q === Infinity ? 'Infinity' : q);
        expect(result.fit.unbounded).toBe(q === Infinity);
        const errors =
          scenario === 'baseline'
            ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 12]
            : [1, 2, 3, 4, 5, 6, 7, 8, 15, 18];
        const covered = errors.filter((e) => e <= q).length;
        expect(result.summary[0].covered).toBe(covered);
        expect(result.summary[1].covered).toBe(errors.slice(0, 8).filter((e) => e <= q).length);
        expect(result.summary[2].covered).toBe(errors.slice(8).filter((e) => e <= q).length);
        expect(result.rows).toHaveLength(10);
        expect(result.calibration).toHaveLength(size);
        expect(result.next.width).toBe(q === Infinity ? 'Infinity' : 2 * q);
        expect(result.rows.map((r: { covered: boolean }) => r.covered)).toEqual(
          errors.map((e) => e <= q),
        );
      }
      expect(cases).toHaveLength(30);
    } finally {
      dom.window.close();
    }
  });

  it('preserves score order independence, separates evaluation/new-point changes, and verifies label sets', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('threshold([2,10,3],50).q')).toBe(3);
      const radii = JSON.parse(
        dom.window.eval(
          `JSON.stringify(calibrationSource.map((_,i)=>calibrate([...calibrationSource.slice(i),...calibrationSource.slice(0,i)].reverse(),80).q))`,
        ),
      );
      expect(radii).toEqual(Array(9).fill(7));
      expect(dom.window.eval('buildReport(9,90,"harder",100).fit.q')).toBe(9);
      expect(dom.window.eval('buildReport(9,90,"harder",100).summary[0].covered')).toBe(8);
      expect(dom.window.eval('buildReport(9,90,"harder",100).summary[2].covered')).toBe(0);
      const shifted = JSON.parse(
        dom.window.eval('JSON.stringify(buildReport(9,90,"baseline",100))'),
      );
      expect([shifted.next.lower, shifted.next.upper]).toEqual([91, 109]);
      expect(shifted.summary[0].covered).toBe(9);
      expect(dom.window.eval('evaluate([{prediction:40,outcome:49}],9)[0].covered')).toBe(true);
      expect(dom.window.eval('evaluate([{prediction:40,outcome:31}],9)[0].covered')).toBe(true);
      const c = reference.example.classification;
      const q = dom.window.eval('threshold(' + JSON.stringify(c.calibration_scores) + ',80).q');
      expect(q).toBe(c.threshold);
      c.probabilities
        .map((p: number) => 1 - p)
        .forEach((score: number, i: number) => expect(score).toBeCloseTo([0.5, 0.65, 0.85][i], 12));
      const set = (probabilities: number[]) =>
        c.labels.filter((_: string, i: number) => 1 - probabilities[i] <= q);
      expect(set(c.probabilities)).toEqual(c.included);
      expect(set(c.confident_probabilities)).toEqual(c.confident_included);
      expect(set([0.34, 0.33, 0.33])).toEqual(c.labels);
    } finally {
      dom.window.close();
    }
  });

  it('handles finite and infinite states, invalid input, responsive layout, and resets', () => {
    const dom = openExample();
    try {
      const document = dom.window.document;
      const change = (id: string, value: string) => {
        const el = document.querySelector('#' + id);
        el.value = value;
        el.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      };
      const initial = document.querySelector('output').textContent;
      change('coverage', '95');
      expect(document.querySelector('output').textContent).toContain('rank 10 · q = ∞');
      expect(document.querySelector('#mechanism').textContent).toContain('All real values');
      expect(document.querySelector('#evaluation').textContent).toContain('Arrows extend beyond');
      expect(document.querySelector('#evaluation').innerHTML).not.toContain('NaN');
      change('size', '5');
      change('coverage', '80');
      expect(document.querySelector('output').textContent).toContain('rank 5 · q = 9');
      expect(document.querySelectorAll('#calibration tr')).toHaveLength(5);
      change('center', '100');
      expect(document.querySelector('#mechanism').textContent).toContain('[91, 109]');
      change('scenario', 'harder');
      expect(document.querySelector('output').textContent).toContain('8/10 covered');
      change('center', '-1');
      expect(document.querySelector('output').textContent).toContain('whole new-point prediction');
      expect(document.querySelectorAll('#summary tr')).toHaveLength(0);
      expect(document.querySelectorAll('#calibration tr')).toHaveLength(0);
      expect(document.querySelectorAll('#evaluation path')).toHaveLength(0);
      document.querySelector('#reset').click();
      expect(document.querySelector('output').textContent).toBe(initial);
      expect(document.querySelector('#center').value).toBe('40');
      expect(document.querySelector('#size').value).toBe('9');
      expect(document.querySelector('#coverage').value).toBe('90');
      expect(document.querySelector('#scenario').value).toBe('baseline');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(document.querySelector('#mechanism').getAttribute('viewBox')).toBe('0 0 328 441');
      expect(document.querySelector('#evaluation').getAttribute('viewBox')).toBe('0 0 328 495');
      expect(document.querySelectorAll('#data tr')).toHaveLength(10);
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
    const article = corpus.entities.find((e) => e.id === 'ml-conformal-prediction')!;
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
    expect(rendered).toContain('/assets/machine-learning/conformal-prediction.svg');
    expect(rendered).toContain('/assets/machine-learning/conformal-prediction-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-conformal-prediction.md'), 'utf8');
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

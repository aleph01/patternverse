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
  resolve(root, 'content/assets/widgets/ml-drift-detection.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-drift-detection');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Drift Detection input signals and separate labeled quality', () => {
  it('constructs individual predictions and independently verifies the default and changed-outcome fixtures', () => {
    const dom = openExample();
    try {
      const r = read(dom, 'report');
      expect(r.monitor.reference.counts).toEqual([80, 20]);
      expect(r.monitor.current.counts).toEqual([20, 80]);
      expect(r.monitor).toMatchObject({
        gapPP: 60,
        gapsPP: [60, 60],
        status: 'investigate',
        aboveThreshold: true,
        sufficient: true,
      });
      expect(r.referenceQuality).toEqual({ n: 100, correct: 75, errors: 25, percent: 75 });
      expect(r.currentQuality).toEqual({ n: 100, correct: 75, errors: 25, percent: 75 });
      expect(r.accuracyDeltaPP).toBe(0);
      expect(new Set(r.currentRows.map((v: { id: string }) => v.id)).size).toBe(100);
      for (const row of r.currentRows) expect(row.prediction).toBe(row.channel === 'web' ? 0 : 1);
      expect(read(dom, "buildReport('errors').monitor.gapPP")).toBe(0);
      expect(read(dom, "buildReport('errors').currentQuality.percent")).toBe(50);
    } finally {
      dom.window.close();
    }
  });
  it('checks all eighteen configurations against independent count and threshold arithmetic', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const scenario of ['mix', 'errors', 'stable'])
        for (const n of [20, 100])
          for (const threshold of [10, 60, 70]) {
            count++;
            const gap = scenario === 'mix' ? 60 : 0,
              correct = n * (scenario === 'errors' ? 0.5 : 0.75),
              percent = scenario === 'errors' ? 50 : 75,
              status = n < 50 ? 'insufficient' : gap > threshold ? 'investigate' : 'no-breach';
            const r = read(dom, `buildReport('${scenario}',${n},${threshold})`);
            expect(r.monitor.current.counts).toEqual(
              scenario === 'mix' ? [n / 5, (n * 4) / 5] : [(n * 4) / 5, n / 5],
            );
            expect(r.monitor).toMatchObject({
              gapPP: gap,
              status,
              sufficient: n >= 50,
              aboveThreshold: gap > threshold,
            });
            expect(r.currentQuality).toEqual({ n, correct, errors: n - correct, percent });
            expect(r.accuracyDeltaPP).toBe(percent - 75);
            expect(r.referenceQuality.correct).toBe(75);
            expect((r.monitor.maxNumerator * 100) / r.monitor.denominator).toBe(gap);
          }
      expect(count).toBe(18);
      expect(read(dom, "buildReport('mix',100,60).monitor.aboveThreshold")).toBe(false);
      expect(read(dom, "buildReport('mix',20,10).monitor.gapPP")).toBe(60);
    } finally {
      dom.window.close();
    }
  });
  it('never reads labels for the input decision, honors exact volume boundaries, and rejects invalid records', () => {
    const dom = openExample();
    try {
      dom.window.eval(
        "var inputOnly = rows => rows.map(({id,channel})=>({id,channel,get prediction(){throw Error('Prediction read');},get label(){throw Error('Label read');}}));",
      );
      expect(
        read(dom, 'monitor(inputOnly(report.referenceRows),inputOnly(report.currentRows)).gapPP'),
      ).toBe(60);
      dom.window.eval(
        "var boundaryRows = Array.from({length:50},(_,i)=>({id:'V'+i,channel:i<10?'web':'app'}));",
      );
      expect(read(dom, 'monitor(report.referenceRows,boundaryRows).status')).toBe('investigate');
      expect(read(dom, 'monitor(report.referenceRows,boundaryRows.slice(0,49)).status')).toBe(
        'insufficient',
      );
      expect(
        read(
          dom,
          'Object.isFrozen(model)&&Object.isFrozen(model.routes)&&Object.isFrozen(channels)',
        ),
      ).toBe(true);
      dom.window.eval(
        'const changed = buildReport(); changed.currentRows[0].label = 999; changed.monitor.current.counts[0]=999;',
      );
      expect(read(dom, 'buildReport().currentQuality.correct')).toBe(75);
      for (const expression of [
        'distribution([])',
        "distribution([{id:'a',channel:'web'},{id:'a',channel:'app'}])",
        "distribution([{id:'a',channel:'other'}])",
        "distribution([{id:'',channel:'web'}])",
        "accuracy([{id:'a',channel:'web',prediction:0}])",
        "accuracy([{id:'a',channel:'web',prediction:2,label:0}])",
        'monitor(report.referenceRows,report.currentRows,-1)',
        'monitor(report.referenceRows,report.currentRows,101)',
        'monitor(report.referenceRows,report.currentRows,10.5)',
        'monitor(report.referenceRows,report.currentRows,10,0)',
        "makeWindow('R',50,80,3)",
        "makeWindow('R',20000,80,3)",
        "makeWindow('R',100,80,4)",
        "route('other')",
        "buildReport('unknown')",
        "buildReport('mix',50)",
        "buildReport('mix',100,20)",
      ])
        expect(() => dom.window.eval(expression)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('independently verifies the joint-change counterexample despite identical marginals', () => {
    const f = reference.example.joint_example,
      ref = f.reference_counts,
      cur = f.current_counts;
    expect(ref.reduce((a: number, b: number) => a + b, 0)).toBe(100);
    expect(cur.reduce((a: number, b: number) => a + b, 0)).toBe(100);
    const channel = (v: number[]) => [v[0] + v[1], v[2] + v[3]],
      length = (v: number[]) => [v[0] + v[2], v[1] + v[3]];
    expect(channel(ref)).toEqual([50, 50]);
    expect(channel(cur)).toEqual([50, 50]);
    expect(length(ref)).toEqual([50, 50]);
    expect(length(cur)).toEqual([50, 50]);
    expect(Math.max(...ref.map((v: number, i: number) => Math.abs(v - cur[i])))).toBe(50);
    expect(f.joint_gap_pp).toBe(50);
  });
  it('changes every control, separates policy from accuracy, sizes for phone and resets', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const e = d.querySelector(id) as HTMLSelectElement;
          e.value = value;
          e.dispatchEvent(new dom.window.Event('change'));
        };
      change('#scenario', 'errors');
      expect(d.querySelector('output')!.textContent).toContain(
        'Input gap 0 pp: No configured input alert. Current accuracy 50% (-25 pp',
      );
      change('#scenario', 'stable');
      expect(d.querySelector('output')!.textContent).toContain('Current accuracy 75% (0 pp');
      change('#scenario', 'mix');
      change('#threshold', '60');
      expect(d.querySelector('output')!.textContent).toContain(
        'Input gap 60 pp: No configured input alert',
      );
      change('#count', '20');
      expect(d.querySelector('output')!.textContent).toContain('Insufficient current volume');
      expect(d.querySelectorAll('#sample tbody tr')).toHaveLength(8);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 760');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({ scenario: 'mix', count: 100, threshold: 10 });
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
    const entity = corpus.entities.find((e) => e.id === 'ml-drift-detection')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-monitoring-and-robustness',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/drift-detection.svg');
    expect(rendered).toContain('/assets/machine-learning/drift-detection-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-drift-detection.md'), 'utf8');
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
    expect(reference.visual.interactive_asset).toBe('ml-drift-detection.html');
    expect(reference.collections).toContain('machine-learning-monitoring-and-robustness');
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/drift-detection' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Largest share gap 60 pp');
    }
  });
});

// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-reframing.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-reframing');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Reframing constant targets and retained information', () => {
  it('reproduces the worked mean, squared error, histogram and tail fixtures', () => {
    const dom = openExample();
    try {
      const r = read(dom, 'report'),
        f = reference.example.default;
      for (const key of [
        'mean',
        'mse',
        'lower',
        'upper',
        'uniform',
        'midpointMean',
        'observedTail',
      ])
        expect(r[key]).toBeCloseTo(f[key], 12);
      expect(r.bins.map((b: { count: number }) => b.count)).toEqual(f.counts);
      expect(r.bins.map((b: { mass: number }) => b.mass)).toEqual(f.masses);
      expect(r.pointCrosses).toBe(false);
      expect(r.identified).toBe(true);
      const coarse = read(dom, "buildReport('balanced','coarse',25)");
      for (const [k, v] of Object.entries(reference.example.coarse_at_25))
        expect(coarse[k]).toBeCloseTo(v as number, 12);
      expect(coarse.observedTail).toBe(0.5);
      expect(read(dom, "buildReport('slower').mean")).toBe(23);
      expect(read(dom, "buildReport('slower').mse")).toBe(104);
    } finally {
      dom.window.close();
    }
  });
  it('independently verifies all eighteen configurations and conserved probability mass', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const [sample, values] of Object.entries(reference.example.samples) as [
        string,
        number[],
      ][])
        for (const [layout, edges] of Object.entries(reference.example.layouts) as [
          string,
          number[],
        ][])
          for (const deadline of reference.example.deadline_choices) {
            count++;
            const r = read(dom, `buildReport('${sample}','${layout}',${deadline})`),
              n = values.length;
            const sum = values.reduce((a, b) => a + b, 0),
              mean = sum / n;
            expect(r.mean).toBeCloseTo(mean, 12);
            expect(r.mse).toBeCloseTo(values.reduce((s, v) => s + v * v, 0) / n - mean * mean, 12);
            const counts = Array(edges.length - 1).fill(0);
            for (const v of values) {
              let j = 0;
              while (v >= edges[j + 1]) j++;
              counts[j]++;
            }
            expect(r.bins.map((b: { count: number }) => b.count)).toEqual(counts);
            expect(r.bins.reduce((s: number, b: { mass: number }) => s + b.mass, 0)).toBeCloseTo(
              1,
              12,
            );
            let lower = 0,
              upper = 0,
              uniform = 0,
              midpoint = 0;
            for (let i = 0; i < counts.length; i++) {
              const mass = counts[i] / n,
                lo = edges[i],
                hi = edges[i + 1];
              lower += lo >= deadline ? mass : 0;
              upper += hi > deadline ? mass : 0;
              uniform += mass * Math.max(0, Math.min(1, (hi - deadline) / (hi - lo)));
              midpoint += (mass * (lo + hi)) / 2;
            }
            expect(r.lower).toBeCloseTo(lower, 12);
            expect(r.upper).toBeCloseTo(upper, 12);
            expect(r.uniform).toBeCloseTo(uniform, 12);
            expect(r.midpointMean).toBeCloseTo(midpoint, 12);
            expect(r.observedTail).toBeCloseTo(values.filter((v) => v >= deadline).length / n, 12);
            expect(r.observedTail).toBeGreaterThanOrEqual(r.lower - 1e-12);
            expect(r.observedTail).toBeLessThanOrEqual(r.upper + 1e-12);
            expect(r.uniform).toBeGreaterThanOrEqual(r.lower - 1e-12);
            expect(r.uniform).toBeLessThanOrEqual(r.upper + 1e-12);
            expect(r.identified).toBe(Math.abs(upper - lower) < 1e-12);
          }
      expect(count).toBe(18);
    } finally {
      dom.window.close();
    }
  });
  it('handles exact boundaries and demonstrates information loss using different raw outcomes', () => {
    const dom = openExample();
    try {
      const r = read(dom, 'fit([0,10,20,30,39],[0,10,20,30,40],30)');
      expect(r.bins.map((b: { count: number }) => b.count)).toEqual([1, 1, 1, 2]);
      expect(r.observedTail).toBe(0.4);
      expect(r.lower).toBe(0.4);
      expect(r.upper).toBe(0.4);
      const a = read(dom, 'fit([1,21],[0,20,40],25)'),
        b = read(dom, 'fit([19,39],[0,20,40],25)');
      expect(a.bins).toEqual(b.bins);
      expect(a.uniform).toBe(b.uniform);
      expect(a.lower).toBe(b.lower);
      expect(a.upper).toBe(b.upper);
      expect(a.mean).toBe(11);
      expect(b.mean).toBe(29);
      expect(a.observedTail).toBe(0);
      expect(b.observedTail).toBe(0.5);
      expect(read(dom, 'fit([0,10],[0,20,40],-1).lower')).toBe(1);
      expect(read(dom, 'fit([0,10],[0,20,40],40).upper')).toBe(0);
      expect(read(dom, 'Object.isFrozen(samples.balanced) && Object.isFrozen(layouts.gap)')).toBe(
        true,
      );
      const before = read(dom, 'samples');
      dom.window.eval('const temp=buildReport();temp.values[0]=999;temp.edges[0]=-100;');
      expect(read(dom, 'samples')).toEqual(before);
    } finally {
      dom.window.close();
    }
  });
  it('rejects malformed samples, unsupported ranges, overlapping edges and invalid controls', () => {
    const dom = openExample();
    try {
      for (const expr of [
        'fit([], [0,40],25)',
        'fit([40],[0,40],25)',
        'fit([-1],[0,40],25)',
        'fit([NaN],[0,40],25)',
        'fit([1],[0,0,40],25)',
        'fit([1],[0,40,20],25)',
        'fit([1],[0,Infinity],25)',
        'fit([1],[0],25)',
        'fit([1],[0,40],NaN)',
        "buildReport('unknown')",
        "buildReport('balanced','unknown')",
        "buildReport('balanced','gap',20)",
      ])
        expect(() => dom.window.eval(expr)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('updates controls, distinguishes inferred interpolation, changes layout and resets optional details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const e = d.querySelector(id) as HTMLSelectElement;
          e.value = value;
          e.dispatchEvent(new dom.window.Event('change'));
        };
      change('#bands', 'coarse');
      expect(d.querySelector('#tail')!.textContent).toContain('bounds 0 to 0.5');
      expect(d.querySelector('#uniform')!.textContent).toContain('0.375');
      change('#sample', 'slower');
      expect(read(dom, 'report.mean')).toBe(23);
      change('#bands', 'fine');
      change('#deadline', '30');
      expect(read(dom, 'report.observedTail')).toBe(0.5);
      expect(read(dom, 'report.identified')).toBe(true);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 770');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        sample: 'balanced',
        bands: 'gap',
        deadline: 25,
        mean: 20,
      });
      expect(d.querySelectorAll('tbody tr')).toHaveLength(3);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-reframing')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/reframing.svg');
    expect(rendered).toContain('/assets/machine-learning/reframing-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-reframing.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/reframing' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Fitted mass 0.5');
    }
  });
});

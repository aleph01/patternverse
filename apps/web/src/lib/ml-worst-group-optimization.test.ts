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
  resolve(root, 'content/assets/widgets/ml-worst-group-optimization.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-worst-group-optimization',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

// Reference MSE from compressed raw targets, independent of optimizer and moment decomposition.
const rawLoss = (prediction: number, s: number) => ({
  a: (prediction - 5) ** 2,
  b: ((prediction - (7 - s)) ** 2 + (prediction - (7 + s)) ** 2) / 2,
});
const expectedTheta = (n: number, s: number, id: string) =>
  id === 'erm' ? (2 * n) / 100 : id === 'balanced' ? 1 : s <= 2 ? 1 + (s * s) / 4 : 2;
describe('Worst-Group Optimization', () => {
  it('reproduces all documented fits and mixture values from the original 100 observations', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.data).toHaveLength(100);
      expect(new Set(r.data.map((d: { id: string }) => d.id)).size).toBe(100);
      expect(r.groups).toEqual([
        { group: 'A', n: 90, mean: 0, variance: 0 },
        { group: 'B', n: 10, mean: 2, variance: 1 },
      ]);
      expect(r.data.filter((d: { y: number }) => d.y === 5)).toHaveLength(90);
      expect(r.data.filter((d: { y: number }) => d.y === 6)).toHaveLength(5);
      expect(r.data.filter((d: { y: number }) => d.y === 8)).toHaveLength(5);
      const expected = [
        [0.2, 5.2, 0.46, 4.24, 3.4],
        [1, 6, 1.1, 2, 1.8],
        [1.25, 6.25, 1.5625, 1.5625, 1.5625],
      ];
      r.fits.forEach(
        (
          f: { theta: number; prediction: number; mean: number; worst: number; projected: number },
          i: number,
        ) =>
          [f.theta, f.prediction, f.mean, f.worst, f.projected].forEach((v, j) =>
            expect(v).toBeCloseTo(expected[i][j], 12),
          ),
      );
      expect(r.fits).toEqual(reference.example.default_fits);
      expect(r.groups).toEqual(reference.example.default_groups);
      expect(r.selected.theta).toBe(1.25);
      expect(r.selected.lossA).toBe(r.selected.lossB);
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all 108 settings, exact fit parameters, empirical losses, moments, and projections', () => {
    const dom = openExample();
    try {
      let checked = 0;
      for (const n of [10, 20, 50])
        for (const s of [0, 1, 2, 3])
          for (const id of ['erm', 'balanced', 'worst'])
            for (const mix of [0.1, 0.5, 0.8]) {
              const r = get(dom, `compute(${n},${s},'${id}',${mix})`);
              expect(r.groups.map((g: { n: number }) => g.n)).toEqual([100 - n, n]);
              expect(r.groups.map((g: { mean: number }) => g.mean)).toEqual([0, 2]);
              expect(r.groups.map((g: { variance: number }) => g.variance)).toEqual([0, s * s]);
              for (const f of r.fits) {
                const theta = expectedTheta(n, s, f.id),
                  v = rawLoss(5 + theta, s);
                expect(f.theta).toBeCloseTo(theta, 12);
                expect(f.prediction).toBeCloseTo(5 + theta, 12);
                expect(f.lossA).toBeCloseTo(v.a, 12);
                expect(f.lossB).toBeCloseTo(v.b, 12);
                expect(f.mean).toBeCloseTo((1 - n / 100) * v.a + (n / 100) * v.b, 12);
                expect(f.worst).toBeCloseTo(Math.max(v.a, v.b), 12);
                expect(f.balanced).toBeCloseTo((v.a + v.b) / 2, 12);
                expect(f.projected).toBeCloseTo((1 - mix) * v.a + mix * v.b, 12);
                const literal =
                  r.data.reduce(
                    (sum: number, d: { y: number }) => sum + (f.prediction - d.y) ** 2,
                    0,
                  ) / 100;
                expect(f.mean).toBeCloseTo(literal, 12);
              }
              expect(r.selected).toEqual(r.fits.find((f: { id: string }) => f.id === id));
              checked++;
            }
      expect(checked).toBe(108);
      expect(checked).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('certifies global minimax solutions with convex lower bounds and verifies all plotted curve values', () => {
    const dom = openExample();
    try {
      for (const s of [0, 1, 2, 3]) {
        const r = get(dom, `compute(10,${s},'worst',0.8)`),
          t = r.selected.theta;
        if (s <= 2) {
          const weightA = 1 - t / 2,
            weightB = t / 2,
            v = rawLoss(5 + t, s);
          expect(weightA).toBeGreaterThanOrEqual(0);
          expect(weightB).toBeGreaterThanOrEqual(0);
          expect(weightA * 2 * t + weightB * 2 * (t - 2)).toBeCloseTo(0, 12);
          expect(v.a).toBeCloseTo(v.b, 12);
          expect(weightA * v.a + weightB * v.b).toBeCloseTo(r.selected.worst, 12);
        } else {
          expect(t).toBe(2);
          expect(r.selected.worst).toBe(s * s);
          expect(r.selected.lossA).toBeLessThan(r.selected.lossB);
        }
        // Max loss is at least any convexly weighted loss, or B's variance floor.
        for (let i = 0; i <= 100; i++) {
          const theta = (i * 2.5) / 100,
            v = rawLoss(5 + theta, s);
          expect(get(dom, `curveLoss(${theta},report.groups[0])`)).toBeCloseTo(theta * theta, 12);
          expect(Math.max(v.a, v.b) + 1e-12).toBeGreaterThanOrEqual(r.selected.worst);
          expect(
            get(dom, `curveLoss(${theta},compute(10,${s},'worst',0.8).groups[1])`),
          ).toBeCloseTo(v.b, 12);
        }
      }
    } finally {
      dom.window.close();
    }
  });
  it('keeps hypothetical mixture changes separate from fitting and group counts separate from minimax importance', () => {
    const dom = openExample();
    try {
      const a = get(dom, "compute(10,1,'erm',0.1)"),
        b = get(dom, "compute(10,1,'erm',0.8)");
      expect(a.data).toEqual(b.data);
      expect(a.groups).toEqual(b.groups);
      const trained = (fits: Record<string, unknown>[]) =>
        fits.map((f) =>
          Object.fromEntries(Object.entries(f).filter(([key]) => key !== 'projected')),
        );
      expect(trained(a.fits)).toEqual(trained(b.fits));
      expect(a.selected.projected).toBeCloseTo(a.selected.mean, 12);
      expect(b.selected.projected).toBeCloseTo(3.4, 12);
      expect(get(dom, "compute(50,1,'worst',0.8).selected.theta")).toBe(1.25);
      expect(get(dom, "compute(50,1,'erm',0.8).selected.theta")).toBe(1);
      expect(get(dom, "compute(10,0,'worst',0.8).selected.theta")).toBe(
        get(dom, "compute(10,0,'balanced',0.8).selected.theta"),
      );
      expect(get(dom, "compute(10,3,'worst',0.8).selected.lossA")).toBe(4);
      expect(get(dom, "compute(10,3,'worst',0.8).selected.lossB")).toBe(9);
      expect(get(dom, "compute(0,1,'worst',0.8).error")).toContain('nonzero support');
      expect(get(dom, "compute(100,1,'worst',0.8).error")).toContain('nonzero support');
      expect(get(dom, "summarize([], 'A')")).toBeNull();
      expect(a).not.toHaveProperty('test_accuracy');
      expect(a).not.toHaveProperty('confidence_interval');
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
    } finally {
      dom.window.close();
    }
  });
  it('updates every control, group table and projection, then resets details and draws a phone layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#fits-data tr')).toHaveLength(3);
      expect(d.querySelectorAll('#group-data tr')).toHaveLength(2);
      change('#method', 'erm');
      expect(d.querySelector('output')!.textContent).toContain('Mean MSE 0.4600');
      change('#mixture', '0.1');
      expect(d.querySelector('#projection')!.textContent).toContain('0.4600');
      change('#count', '50');
      expect(get(dom, 'report.groups.map(g=>g.n)')).toEqual([50, 50]);
      change('#spread', '3');
      change('#method', 'worst');
      expect(get(dom, 'report.selected.theta')).toBe(2);
      expect(d.querySelector('output')!.textContent).toContain('Worst MSE 9.0000');
      (d.querySelector('#data') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(get(dom, '[report.countB,report.spread,report.method,report.mixture]')).toEqual([
        10,
        1,
        'worst',
        0.8,
      ]);
      expect((d.querySelector('#data') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 1080');
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
    const article = corpus.entities.find((e) => e.id === 'ml-worst-group-optimization')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-monitoring-and-robustness',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/worst-group-optimization.svg');
    expect(rendered).toContain('/assets/machine-learning/worst-group-optimization-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-worst-group-optimization.md'),
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

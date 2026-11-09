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
  resolve(root, 'content/assets/widgets/ml-differentially-private-training.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-differentially-private-training',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

// Independent oracle: radial projection uses angle and radius; accounting minimizes
// the composed Gaussian Rényi bound numerically over order alpha > 1.
function projection(v: number[], C: number) {
  const angle = Math.atan2(v[1], v[0]),
    radius = Math.min(C, Math.sqrt(v[0] ** 2 + v[1] ** 2));
  return [radius * Math.cos(angle), radius * Math.sin(angle)];
}
function renyiBound(C: number, sigma: number, T: number, delta: number) {
  const distance = 2 * C,
    variance = (sigma * C) ** 2;
  const evaluate = (alpha: number) =>
    (T * alpha * distance ** 2) / (2 * variance) + Math.log(1 / delta) / (alpha - 1);
  let left = 1.0000001,
    right = 1000;
  for (let i = 0; i < 160; i++) {
    const p = left + (right - left) / 3,
      q = right - (right - left) / 3;
    if (evaluate(p) < evaluate(q)) right = q;
    else left = p;
  }
  return evaluate((left + right) / 2);
}
const closeVector = (actual: number[], expected: number[]) => {
  expect(actual).toHaveLength(expected.length);
  actual.forEach((x, i) => expect(x).toBeCloseTo(expected[i], 11));
};
describe('Differentially Private Training', () => {
  it('reproduces the documented clipping, replay, update, and full-batch accounting', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      r.clipped.forEach((v: number[], i: number) =>
        closeVector(v, reference.example.default_clipped_gradients[i]),
      );
      closeVector(r.sum, [-0.4, 1.3]);
      closeVector(r.noise, [1, -2]);
      closeVector(r.noisySum, [0.6, -0.7]);
      closeVector(r.mean, [0.15, -0.175]);
      closeVector(r.update, [-0.015, 0.0175]);
      expect(r.rho).toBe(0.125);
      expect(r.sensitivity).toBe(2);
      expect(r.sd).toBe(4);
      expect(r.epsilon).toBeCloseTo(2.5242629560940406, 10);
      expect(r.epsilon).toBeCloseTo(reference.example.default_epsilon, 12);
      expect(get(dom, 'account(1,4,4,.00001).epsilon')).toBeCloseTo(
        reference.example.four_access_epsilon,
        12,
      );
      expect(r.clippedCount).toBe(3);
    } finally {
      dom.window.close();
    }
  });
  it('checks all 216 offered settings against independent vector geometry and optimized Rényi bounds', () => {
    const dom = openExample();
    const vectors = [
        [3, 4],
        [0, 2],
        [-2, 0],
        [0, -0.5],
      ],
      draws: Record<string, number[]> = { A: [0.25, -0.5], B: [-1, 0.75], zero: [0, 0] };
    let count = 0;
    try {
      for (const C of [0.5, 1, 2])
        for (const sigma of [0, 2, 4, 8])
          for (const T of [1, 4, 16])
            for (const delta of [1e-5, 1e-7])
              for (const replay of ['A', 'B', 'zero']) {
                const r = get(dom, `compute(${C},${sigma},${T},${delta},'${replay}')`),
                  clipped = vectors.map((v) => projection(v, C));
                const sum = [0, 1].map((i) => clipped.reduce((n, v) => n + v[i], 0));
                r.clipped.forEach((v: number[], i: number) => closeVector(v, clipped[i]));
                closeVector(r.sum, sum);
                closeVector(
                  r.update,
                  sum.map((v, i) => -(v + draws[replay][i] * sigma * C) / 40),
                );
                if (sigma) expect(r.epsilon).toBeCloseTo(renyiBound(C, sigma, T, delta), 9);
                else {
                  expect(r.epsilon).toBeNull();
                  expect(r.rho).toBeNull();
                }
                count++;
              }
      expect(count).toBe(216);
    } finally {
      dom.window.close();
    }
  });
  it('bounds individual vectors and exhibits the replace-one sensitivity rather than clipping the mean', () => {
    const dom = openExample();
    try {
      closeVector(get(dom, 'clipVector([0,0],1)'), [0, 0]);
      for (const C of [0.5, 1, 2]) {
        for (const v of [
          [0, 0],
          [3, 4],
          [-8, 6],
          [0.2, -0.1],
          [0, -C],
          [1e4, 1e4],
        ]) {
          const actual = get(dom, `clipVector(${JSON.stringify(v)},${C})`);
          closeVector(actual, projection(v, C));
          expect(Math.hypot(...actual)).toBeLessThanOrEqual(C + 1e-12);
        }
        const positive = get(dom, `clipVector([100,0],${C})`),
          negative = get(dom, `clipVector([-100,0],${C})`);
        expect(Math.hypot(positive[0] - negative[0], positive[1] - negative[1])).toBe(2 * C);
      }
      const clippedMean = get(dom, 'clipVector([.25,1.375],1)'),
        meanOfClipped = get(dom, 'report.sum.map(x=>x/4)');
      expect(clippedMean[0]).not.toBeCloseTo(meanOfClipped[0], 4);
      // A (3,4) vector is scaled radially to (.6,.8), not coordinate-clamped to (1,1).
      closeVector(get(dom, 'clipVector([3,4],1)'), [0.6, 0.8]);
    } finally {
      dom.window.close();
    }
  });
  it('separates replay values, clipping scale, repeated access, and the randomized guarantee', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      for (const C of [0.5, 1, 2])
        expect(get(dom, `account(${C},4,1,.00001).epsilon`)).toBe(r.epsilon);
      for (const replay of ['A', 'B', 'zero'])
        expect(get(dom, `compute(1,4,1,.00001,'${replay}').epsilon`)).toBe(r.epsilon);
      expect(get(dom, 'compute(1,4,1,.00001,"zero").update')).not.toEqual(r.update);
      for (const T of [4, 16]) {
        const longer = get(dom, `compute(1,4,${T},.00001,'A')`);
        closeVector(longer.update, r.update);
        expect(longer.rho).toBe(r.rho * T);
        expect(longer.epsilon).toBeGreaterThan(r.epsilon);
      }
      expect(get(dom, 'account(1,8,1,.00001).epsilon')).toBeLessThan(r.epsilon);
      expect(get(dom, 'account(1,4,1,.0000001).epsilon')).toBeGreaterThan(r.epsilon);
      expect(get(dom, 'compute(1,0,1,.00001,"A").epsilon')).toBeNull();
      closeVector(get(dom, 'compute(1,0,1,.00001,"A").noise'), [0, 0]);
      expect(source).toContain('not a private training tool');
      expect(source).toContain('T changes the accounting only');
    } finally {
      dom.window.close();
    }
  });
  it('updates controls and no-noise messaging, then resets inputs, details, and phone layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#record-data tr')).toHaveLength(4);
      expect(d.querySelectorAll('#metrics tr')).toHaveLength(8);
      change('#accesses', '4');
      expect(d.querySelector('output')!.textContent).toContain('5.2985');
      change('#sigma', '0');
      expect(d.querySelector('output')!.textContent).toContain('NO FINITE DP BOUND');
      expect(d.querySelector('#ledger')!.textContent).toContain('undefined');
      change('#clip', '0.5');
      change('#replay', 'B');
      change('#delta', '0.0000001');
      (d.querySelector('#records') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(get(dom, '[report.C,report.sigma,report.T,report.delta,report.replay]')).toEqual([
        1,
        4,
        1,
        0.00001,
        'A',
      ]);
      expect((d.querySelector('#records') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 850');
      expect(d.querySelector('#mechanism')!.textContent).toContain('Ledger: T = 1; full batch');
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
    const article = corpus.entities.find((e) => e.id === 'ml-differentially-private-training')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-privacy-and-governance',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/differentially-private-training.svg');
    expect(rendered).toContain(
      '/assets/machine-learning/differentially-private-training-mobile.svg',
    );
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-differentially-private-training.md'),
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
    expect(reference.sources).toHaveLength(5);
    expect(reference.example_user_queries).toHaveLength(12);
  });
});

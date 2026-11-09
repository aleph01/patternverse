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
  resolve(root, 'content/assets/widgets/ml-replay-based-continual-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-replay-based-continual-learning',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

const ids = ['A1', 'A2', 'A3', 'A4', 'B1', 'B2', 'B3', 'B4'];
const reservoir: Record<number, Record<number, string[]>> = {
  2: { 1: ['A4', 'B4'], 7: ['A3', 'B2'], 19: ['B3', 'B4'] },
  4: { 1: ['B2', 'A2', 'A3', 'B4'], 7: ['B1', 'B4', 'B3', 'A4'], 19: ['B1', 'A2', 'B3', 'A4'] },
  8: { 1: ids, 7: ids, 19: ids },
};
const expectedIds = (cap: number, policy: string, seed: number) =>
  !cap
    ? []
    : policy === 'fifo'
      ? ids.slice(-cap)
      : policy === 'balanced'
        ? [...ids.slice(4 - cap / 2, 4), ...ids.slice(8 - cap / 2)]
        : reservoir[cap][seed];
type Matrix = number[][];
const multiply = (a: Matrix, b: Matrix) =>
  a.map((row) => b[0].map((_, j) => row.reduce((s, v, k) => s + v * b[k][j], 0)));
const power = (m: Matrix, n: number): Matrix => {
  let out = [
      [1, 0, 0],
      [0, 1, 0],
      [0, 0, 1],
    ],
    base = m;
  while (n) {
    if (n % 2) out = multiply(out, base);
    base = multiply(base, base);
    n = Math.floor(n / 2);
  }
  return out;
};
// Derive the quadratic Hessian in deviations from the joint solution (1,-1,1),
// then apply its matrix power rather than reproducing the widget's gradient loop.
const solution = (na: number, nb: number, rho: number, t: number) => {
  const e = na + nb ? rho : 0,
    q = 1 - e,
    diag = [na + nb ? na / (na + nb) : 0, na + nb ? nb / (na + nb) : 0, 0],
    m = diag.map((v, i) =>
      diag.map((_, j) => Number(i === j) - 0.25 * (q + (i === j ? e * v : 0))),
    ),
    mt = power(m, t);
  return [1, -1, 1].map((v, i) => v - mt[i][2]);
};
const error = (w: number[]) => ({
  a: (w[0] - 1) ** 2,
  b: (w[1] + 1) ** 2,
  old: ((w[0] - 1) ** 2 + (w[1] + 1) ** 2) / 2,
  new: (w.reduce((s, v) => s + v, 0) - 1) ** 2,
});
const subsets = (values: string[], k: number): string[][] =>
  k === 0
    ? [[]]
    : values.length < k
      ? []
      : values.flatMap((v, i) => subsets(values.slice(i + 1), k - 1).map((rest) => [v, ...rest]));
describe('Replay-Based Continual Learning', () => {
  it('reproduces the complete default buffer, gradients, weights, and all documented comparisons', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report'),
        last = r.trace.at(-1);
      expect(r.memory.slots.map((v: { id: string }) => v.id)).toEqual(
        reference.example.default_buffer,
      );
      expect(r.trace).toHaveLength(13);
      expect(r.trace[0].w).toEqual([1, -1, 0]);
      expect(r.trace[1].w).toEqual([1.125, -0.875, 0.125]);
      expect(r.trace[1].newGradient).toEqual([-1, -1, -1]);
      expect(r.trace[1].memoryGradient).toEqual([0, 0, 0]);
      expect(r.trace[1].gradient).toEqual([-0.5, -0.5, -0.5]);
      last.w.forEach((v: number, i: number) =>
        expect(v).toBeCloseTo(reference.example.default_weights[i], 13),
      );
      expect(last.old).toBeCloseTo(reference.example.default_old_mse, 13);
      expect(last.new).toBeCloseTo(reference.example.default_new_mse, 13);
      expect(r.control.at(-1).old).toBeCloseTo(reference.example.matched_control_old_mse, 13);
      expect(r.control.at(-1).new).toBeCloseTo(reference.example.matched_control_new_mse, 13);
      expect(r.currentOnly.at(-1).old).toBeCloseTo(0.11111109786563489, 13);
      expect(r.currentOnly.at(-1).new).toBeLessThan(1e-12);
      expect(get(dom, 'historyData.map(r=>[r.id,r.cohort,r.x,r.y])')).toEqual(
        ids.map((id) => [id, id[0], id[0] === 'A' ? [1, 0, 0] : [0, 1, 0], id[0] === 'A' ? 1 : -1]),
      );
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all 576 training configurations using quadratic matrix powers and closed-form controls', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const cap of [0, 2, 4, 8])
        for (const policy of ['fifo', 'balanced', 'reservoir'])
          for (const rho of [0, 0.25, 0.5, 0.75])
            for (const t of [1, 4, 12, 40])
              for (const seed of [1, 7, 19]) {
                const r = get(dom, `compute(${cap},'${policy}',${rho},${t},${seed})`),
                  expected = expectedIds(cap, policy, seed),
                  a = expected.filter((x) => x.startsWith('A')).length,
                  b = expected.length - a,
                  w = solution(a, b, rho, t),
                  v = error(w),
                  last = r.trace.at(-1);
                expect(r.memory.slots.map((x: { id: string }) => x.id)).toEqual(expected);
                last.w.forEach((n: number, i: number) => expect(n).toBeCloseTo(w[i], 11));
                for (const key of ['a', 'b', 'old', 'new'] as const)
                  expect(last[key]).toBeCloseTo(v[key], 11);
                expect(r.trace).toHaveLength(t + 1);
                expect(r.trace.slice(1).map((s: { currentId: string }) => s.currentId)).toEqual(
                  Array.from({ length: t }, (_, i) => 'C' + (i + 1)),
                );
                const rate = 0.25 * (1 - (cap ? rho : 0)),
                  delta = (1 - (1 - 3 * rate) ** t) / 3;
                expect(r.controlRate).toBe(rate);
                expect(r.control.at(-1).old).toBeCloseTo(delta * delta, 12);
                expect(r.control.at(-1).new).toBeCloseTo((1 - 3 * rate) ** (2 * t), 12);
                expect(r.effective).toBe(cap ? rho : 0);
                count++;
              }
      expect(count).toBe(576);
      expect(count).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('checks reservoir draws with exact integer arithmetic, prefix invariants, and all possible coverage subsets', () => {
    const dom = openExample();
    try {
      for (const cap of [0, 2, 4, 8])
        for (const seed of [1, 7, 19]) {
          const r = get(dom, `compute(${cap},'reservoir',.5,12,${seed})`);
          let state = BigInt(seed);
          const actual: string[] = [];
          r.memory.events.forEach(
            (
              event: { id: string; seen: number; draw: number | null; slots: string[] },
              index: number,
            ) => {
              if (cap) {
                if (index < cap) actual.push(ids[index]);
                else {
                  state = (state * 16807n) % 2147483647n;
                  const draw = Number((state * BigInt(index + 1)) / 2147483647n);
                  expect(event.draw).toBe(draw);
                  if (draw < cap) actual[draw] = ids[index];
                }
              }
              expect(event.slots).toEqual(actual);
              expect(new Set(event.slots).size).toBe(event.slots.length);
              expect(event.slots.length).toBeLessThanOrEqual(cap);
              event.slots.forEach((id) => expect(ids.slice(0, index + 1)).toContain(id));
            },
          );
          const all = subsets(ids, cap),
            missing = all.filter(
              (s) => !s.some((id) => id[0] === 'A') || !s.some((id) => id[0] === 'B'),
            ).length;
          expect(r.missingProbability).toBeCloseTo(missing / all.length, 14);
          if (cap === 2) {
            expect(all).toHaveLength(28);
            expect(missing).toBe(12);
          }
          if (cap === 4) {
            expect(all).toHaveLength(70);
            expect(missing).toBe(2);
          }
        }
      expect(get(dom, "compute(2,'reservoir',.5,12,19).memory.slots.map(r=>r.id)")).toEqual([
        'B3',
        'B4',
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('verifies gradients by finite differences, matching step controls, omitted-cohort effects, and empty-memory semantics', () => {
    const dom = openExample();
    try {
      for (const policy of ['fifo', 'balanced', 'reservoir'])
        for (const rho of [0, 0.25, 0.5, 0.75]) {
          const r = get(dom, `compute(4,'${policy}',${rho},12,7)`);
          for (const snap of r.trace.slice(1)) {
            const objective = (w: number[]) => {
              const current = (w.reduce((s, v) => s + v, 0) - 1) ** 2 / 2,
                memory =
                  r.memory.slots.reduce(
                    (s: number, row: { x: number[]; y: number }) =>
                      s + (w.reduce((n, v, i) => n + v * row.x[i], 0) - row.y) ** 2 / 2,
                    0,
                  ) / r.memory.slots.length;
              return (1 - rho) * current + rho * memory;
            };
            for (let j = 0; j < 3; j++) {
              const hi = [...snap.before],
                lo = [...snap.before];
              hi[j] += 1e-6;
              lo[j] -= 1e-6;
              expect(snap.gradient[j]).toBeCloseTo((objective(hi) - objective(lo)) / 2e-6, 8);
              expect(snap.w[j]).toBeCloseTo(snap.before[j] - 0.25 * snap.gradient[j], 13);
            }
          }
        }
      const a = get(dom, 'report'),
        fifo = get(dom, "compute(4,'fifo',.5,12,7)");
      expect(a.trace[1].w).toEqual(a.control[1].w);
      expect(a.trace[2].w).not.toEqual(a.control[2].w);
      expect(a.trace.at(-1).old).toBeLessThan(a.control.at(-1).old);
      expect(fifo.trace.at(-1).a).toBeGreaterThan(fifo.trace.at(-1).b);
      expect(fifo.trace.every((v: { memoryGradient: number[] }) => v.memoryGradient[0] === 0)).toBe(
        true,
      );
      const empty = get(dom, "compute(0,'reservoir',.75,12,19)");
      expect(empty.effective).toBe(0);
      expect(empty.trace).toEqual(empty.currentOnly);
      expect(empty.trace).toEqual(empty.control);
      expect(get(dom, 'metrics([1,-1,1])')).toEqual({ a: 0, b: 0, old: 0, new: 0 });
      expect(get(dom, "compute(4,'balanced',.5,40,19).memory")).toEqual(a.memory);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
    } finally {
      dom.window.close();
    }
  });
  it('updates every setting, navigates and inspects actual steps, then restores defaults and phone layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#buffer-data tr')).toHaveLength(4);
      (d.querySelector('#start') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toContain('Update 0 of 12');
      expect((d.querySelector('#previous') as HTMLButtonElement).disabled).toBe(true);
      (d.querySelector('#next') as HTMLButtonElement).click();
      expect(get(dom, 'cursor')).toBe(1);
      expect(d.querySelector('#step-values')!.textContent).toContain('1.1250');
      (d.querySelector('#previous') as HTMLButtonElement).click();
      const slider = d.querySelector('#cursor') as HTMLInputElement;
      slider.value = '4';
      slider.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(get(dom, 'cursor')).toBe(4);
      (d.querySelector('#final') as HTMLButtonElement).click();
      expect(get(dom, 'cursor')).toBe(12);
      change('#capacity', '2');
      change('#policy', 'reservoir');
      change('#seed', '19');
      expect(d.querySelector('#coverage')!.textContent).toContain('42.86%');
      expect(get(dom, 'report.memory.slots.map(r=>r.id)')).toEqual(['B3', 'B4']);
      change('#weight', '0.75');
      change('#updates', '4');
      expect(d.querySelectorAll('#history-data tr')).toHaveLength(5);
      expect(slider.max).toBe('4');
      for (const id of ['#data', '#gradient', '#history'])
        (d.querySelector(id) as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(
        get(dom, '[report.capacity,report.policy,report.rho,report.steps,report.seed,cursor]'),
      ).toEqual([4, 'balanced', 0.5, 12, 7, 12]);
      expect(d.querySelectorAll('details[open]')).toHaveLength(0);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 970');
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
    const article = corpus.entities.find((e) => e.id === 'ml-replay-based-continual-learning')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-learning-and-adaptation',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/replay-based-continual-learning.svg');
    expect(rendered).toContain(
      '/assets/machine-learning/replay-based-continual-learning-mobile.svg',
    );
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-replay-based-continual-learning.md'),
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

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
  resolve(root, 'content/assets/widgets/ml-transfer-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-transfer-learning');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Transfer Learning parameter reuse and adaptation', () => {
  it('reproduces the first batch update and the article head-size calculation', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'inputs')).toEqual(reference.example.inputs);
      expect(read(dom, 'initial')).toEqual(reference.example.initial);
      expect(read(dom, 'report.data.map(r=>r.y)')).toEqual(reference.example.targets);
      expect(read(dom, 'report.frozen.loss')).toBe(0.25);
      expect(read(dom, 'report.tuned.gradient')).toEqual({ a: 0, b: -0.5, w: 0 });
      dom.window.eval('learn(1)');
      expect(read(dom, 'report.frozen')).toMatchObject(reference.example.frozen_next);
      expect(read(dom, 'report.tuned')).toMatchObject(reference.example.tuned_next);
      expect(read(dom, 'report.predictions.map(r=>r.tuned)')).toEqual([1, -1, 0.25, -0.25]);
      const h = reference.example.head_example;
      expect(h.features * h.classes + h.classes).toBe(h.parameters);
    } finally {
      dom.window.close();
    }
  });
  it('checks every gradient against an independent finite-difference objective across both trajectories', () => {
    const dom = openExample();
    try {
      const data = reference.example.inputs as number[][];
      const objective = (p: { a: number; b: number; w: number }) =>
        data.reduce((s, x) => s + (p.w * (p.a * x[0] + p.b * x[1]) - x[0] - x[1]) ** 2, 0) / 8;
      for (let step = 0; step <= 40; step++) {
        for (const route of ['frozen', 'tuned']) {
          const p = read(dom, route),
            g = read(dom, `measure(${route},rows('both')).gradient`);
          expect(read(dom, `report.${route}.loss`)).toBeCloseTo(objective(p), 13);
          for (const k of ['a', 'b', 'w'] as const) {
            const plus = { ...p, [k]: p[k] + 1e-5 },
              minus = { ...p, [k]: p[k] - 1e-5 };
            expect(g[k]).toBeCloseTo((objective(plus) - objective(minus)) / 2e-5, 8);
          }
        }
        dom.window.eval('learn(1)');
      }
    } finally {
      dom.window.close();
    }
  });
  it('preserves frozen parameters and reaches the analytic training optima without using target labels as features', () => {
    const dom = openExample();
    try {
      // For an arbitrary scalar head, the frozen objective is ((w-1)^2+1)/4, with minimum 1/4.
      for (const w of [-3, 0, 0.5, 1, 2, 5])
        expect(read(dom, `measure({a:1,b:0,w:${w}},rows('both')).loss`)).toBe(
          ((w - 1) ** 2 + 1) / 4,
        );
      for (let i = 0; i < 40; i++) {
        const before = read(dom, 'report.tuned.loss');
        dom.window.eval('learn(1)');
        expect(read(dom, 'frozen')).toEqual(reference.example.initial);
        expect(read(dom, 'report.frozen.loss')).toBe(0.25);
        expect(read(dom, 'report.tuned.loss')).toBeLessThanOrEqual(before + 1e-14);
      }
      expect(read(dom, 'report.tuned.loss')).toBeLessThan(1e-10);
      expect(read(dom, 'predict(frozen,[0,1])')).toBe(read(dom, 'predict(frozen,[0,-1])'));
      expect(read(dom, 'inputs')).toEqual(reference.example.inputs);
      expect(() => dom.window.eval("rows('unknown')")).toThrow('Unsupported task');
    } finally {
      dom.window.close();
    }
  });
  it('uses a simultaneous update and obtains the same result under row permutation', () => {
    const dom = openExample();
    try {
      const p = { a: 0.6, b: -0.2, w: 0.7 };
      const expr = JSON.stringify(p);
      const next = read(dom, `update(${expr},rows('both'),true)`);
      // Independent closed form for the axis-symmetric four-row training set.
      const gA = (p.w * (p.w * p.a - 1)) / 2,
        gB = (p.w * (p.w * p.b - 1)) / 2;
      const gW = (p.a * (p.w * p.a - 1) + p.b * (p.w * p.b - 1)) / 2;
      expect(next.a).toBeCloseTo(p.a - 0.5 * gA, 14);
      expect(next.b).toBeCloseTo(p.b - 0.5 * gB, 14);
      expect(next.w).toBeCloseTo(p.w - 0.5 * gW, 14);
      expect(read(dom, `update(${expr},rows('both').reverse(),true)`)).toEqual(next);
      expect(read(dom, `update(${expr},rows('both'),false)`)).toMatchObject({
        a: p.a,
        b: p.b,
        w: next.w,
      });
    } finally {
      dom.window.close();
    }
  });
  it('resets on task changes, preserves a solved task, caps training, and restores controls and details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document;
      dom.window.eval('learn(10)');
      const select = d.querySelector('#task') as HTMLSelectElement;
      select.value = 'retained';
      select.dispatchEvent(new dom.window.Event('change'));
      expect(read(dom, 'steps')).toBe(0);
      expect(read(dom, 'report.frozen.loss')).toBe(0);
      expect(read(dom, 'report.tuned.loss')).toBe(0);
      dom.window.eval('learn(100)');
      expect(read(dom, 'steps')).toBe(40);
      expect(read(dom, 'tuned')).toEqual(reference.example.initial);
      expect((d.querySelector('#step') as HTMLButtonElement).disabled).toBe(true);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 810');
      (d.querySelector('#state') as HTMLDetailsElement).open = true;
      (d.querySelector('#assumptions') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(select.value).toBe('both');
      expect(read(dom, 'steps')).toBe(0);
      expect(read(dom, 'report.frozen.loss')).toBe(0.25);
      expect(read(dom, 'report.tuned.loss')).toBe(0.25);
      expect((d.querySelector('#state') as HTMLDetailsElement).open).toBe(false);
      expect((d.querySelector('#assumptions') as HTMLDetailsElement).open).toBe(false);
    } finally {
      dom.window.close();
    }
  });
  it('integrates the article contract, recommendations, sources, responsive assets and explorer', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const entity = corpus.entities.find((e) => e.id === 'ml-transfer-learning')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-learning-and-adaptation',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/transfer-learning.svg');
    expect(rendered).toContain('/assets/machine-learning/transfer-learning-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-transfer-learning.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/transfer-learning' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('0.140625');
    }
  });
});

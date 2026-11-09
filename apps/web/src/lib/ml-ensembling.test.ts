// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-ensembling.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-ensembling');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Ensembling combinations and joint errors', () => {
  it('reproduces the six-record example and the distinct hard/soft voting calculation', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'actual')).toEqual(reference.example.actual);
      expect(read(dom, 'patterns')).toEqual(reference.example.patterns);
      expect(read(dom, 'report.selected.rows[0]')).toMatchObject({
        id: 'D1',
        actual: 10,
        predictions: [16, 10, 4],
        prediction: 10,
        error: 0,
      });
      expect(read(dom, 'report.selected.members.map(m=>m.mae)')).toEqual([4, 4, 4]);
      for (const m of read(dom, 'report.selected.members'))
        expect(m.rmse).toBeCloseTo(Math.sqrt(24), 14);
      expect(read(dom, 'report.selected.combined')).toEqual({ mae: 0, rmse: 0 });
      expect(read(dom, 'report.reference.combined.mae')).toBe(4);
      const c = reference.example.classification_example;
      expect(c.positive_probabilities.filter((p: number) => p >= c.threshold)).toHaveLength(
        c.hard_positive_votes,
      );
      expect(c.positive_probabilities.reduce((a: number, b: number) => a + b, 0) / 3).toBeCloseTo(
        c.soft_positive_probability,
        15,
      );
      expect(c.soft_positive_probability).toBeCloseTo(0.3433333333333333, 15);
      expect(c.hard_class).toBe(1);
      expect(c.soft_class).toBe(0);
    } finally {
      dom.window.close();
    }
  });
  it('independently checks every offered scenario and rule with error-space arithmetic', () => {
    const dom = openExample();
    try {
      const fixtures = reference.example.patterns as Record<string, number[][]>;
      for (const [scenario, errors] of Object.entries(fixtures))
        for (const method of reference.example.methods) {
          const result = read(dom, `buildReport('${scenario}','${method}').selected`);
          const expected = reference.example.actual.map((_: number, i: number) => {
            const e = errors.map((row) => row[i]);
            if (method === 'median') return e[0] + e[1] + e[2] - Math.min(...e) - Math.max(...e);
            const expanded = method === 'weighted' ? [e[0], e[0], e[1], e[2]] : e;
            return expanded.reduce((s, v) => s + v, 0) / expanded.length;
          });
          expect(result.rows.map((row: { error: number }) => row.error)).toEqual(expected);
          expect(result.combined.mae).toBe(reference.example.ensemble_mae[scenario][method]);
          expect(result.combined.rmse).toBeCloseTo(Math.hypot(...expected) / Math.sqrt(6), 14);
          for (let i = 0; i < 6; i++)
            expect(result.rows[i].prediction).toBe(reference.example.actual[i] + expected[i]);
        }
    } finally {
      dom.window.close();
    }
  });
  it('preserves agreement and translation, keeps combinations in the member range and distinguishes weighting from permutation-invariant rules', () => {
    const dom = openExample();
    try {
      for (const values of [
        [1, 1, 1],
        [-10, 0, 20],
        [0.1, 0.7, 0.3],
        [4, 16, 10],
      ])
        for (const method of reference.example.methods) {
          const json = JSON.stringify(values),
            c = read(dom, `combine(${json},'${method}')`);
          expect(c).toBeGreaterThanOrEqual(Math.min(...values));
          expect(c).toBeLessThanOrEqual(Math.max(...values));
          expect(
            read(dom, `combine(${JSON.stringify(values.map((x) => x + 7))},'${method}')`),
          ).toBeCloseTo(c + 7, 14);
          if (method !== 'weighted')
            expect(
              read(dom, `combine(${JSON.stringify([...values].reverse())},'${method}')`),
            ).toBeCloseTo(c, 14);
        }
      for (const method of reference.example.methods)
        expect(read(dom, `combine([5,5,5],'${method}')`)).toBe(5);
      expect(read(dom, "combine([16,10,4],'weighted')")).toBe(11.5);
      expect(read(dom, "combine([4,10,16],'weighted')")).toBe(8.5);
      expect(() => dom.window.eval("combine([1,2],'mean')")).toThrow('Three finite');
      expect(() => dom.window.eval("dataset('unknown')")).toThrow('Unsupported scenario');
      expect(() => dom.window.eval("buildReport('shared','unknown')")).toThrow('Unsupported rule');
    } finally {
      dom.window.close();
    }
  });
  it('demonstrates redundancy and a harmful member while verifying nonnegative averaging error bounds', () => {
    const dom = openExample();
    try {
      for (const scenario of Object.keys(reference.example.patterns))
        for (const method of ['mean', 'weighted']) {
          const result = read(dom, `evaluate('${scenario}','${method}')`),
            weights = method === 'mean' ? [1 / 3, 1 / 3, 1 / 3] : [0.5, 0.25, 0.25];
          const memberMaeBound = result.members.reduce(
            (sum: number, m: { mae: number }, i: number) => sum + weights[i] * m.mae,
            0,
          );
          const memberMseBound = result.members.reduce(
            (sum: number, m: { rmse: number }, i: number) => sum + weights[i] * m.rmse ** 2,
            0,
          );
          expect(result.combined.mae).toBeLessThanOrEqual(memberMaeBound + 1e-12);
          expect(result.combined.rmse ** 2).toBeLessThanOrEqual(memberMseBound + 1e-12);
        }
      for (const method of reference.example.methods)
        expect(read(dom, `evaluate('shared','${method}').combined`)).toEqual(
          read(dom, `evaluate('shared','${method}').members[0]`),
        );
      expect(read(dom, "evaluate('poor','mean').members.map(m=>m.mae)")).toEqual([2, 2, 30]);
      expect(read(dom, "evaluate('poor','mean').combined.mae")).toBe(10);
      expect(read(dom, "evaluate('poor','median').combined.mae")).toBe(2);
    } finally {
      dom.window.close();
    }
  });
  it('keeps fixture inputs unchanged across controls and restores both inputs and optional explanations', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        before = dom.window.eval('JSON.stringify({actual,patterns})');
      const change = (id: string, v: string) => {
        const s = d.querySelector(id) as HTMLSelectElement;
        s.value = v;
        s.dispatchEvent(new dom.window.Event('change'));
      };
      change('#scenario', 'poor');
      expect(read(dom, 'report.selected.combined.mae')).toBe(10);
      change('#method', 'median');
      expect(read(dom, 'report.selected.combined.mae')).toBe(2);
      expect(d.querySelector('#calculation')!.textContent).toContain('middle forecast is 12.0');
      change('#method', 'weighted');
      expect(read(dom, 'report.selected.combined.mae')).toBe(7.5);
      expect(dom.window.eval('JSON.stringify({actual,patterns})')).toBe(before);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 820');
      for (const detail of d.querySelectorAll('details'))
        (detail as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({ scenario: 'complementary', method: 'mean' });
      expect(read(dom, 'report.selected.combined.mae')).toBe(0);
      for (const detail of d.querySelectorAll('details'))
        expect((detail as HTMLDetailsElement).open).toBe(false);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-ensembling')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-learning-and-adaptation',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/ensembling.svg');
    expect(rendered).toContain('/assets/machine-learning/ensembling-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-ensembling.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/ensembling' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Combined MAE 0.0 orders');
    }
  });
});

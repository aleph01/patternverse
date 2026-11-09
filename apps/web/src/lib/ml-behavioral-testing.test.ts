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
  resolve(root, 'content/assets/widgets/ml-behavioral-testing.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-behavioral-testing');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Behavioral Testing worked example', () => {
  it('computes the documented default predictions and capability counts', () => {
    const dom = openExample();
    try {
      const rows = JSON.parse(dom.window.eval('JSON.stringify(results)'));
      expect(rows).toHaveLength(7);
      expect(JSON.parse(dom.window.eval('JSON.stringify(counts(results))'))).toEqual({
        MFT: { passed: 2, total: 3 },
        INV: { passed: 0, total: 2 },
        DIR: { passed: 2, total: 2 },
      });
      const byId = Object.fromEntries(rows.map((r: { id: string }) => [r.id, r]));
      expect(byId['mft-good'].beforeScore).toBeCloseTo(reference.example.positive_score, 12);
      expect(byId['mft-bad'].beforeScore).toBeCloseTo(reference.example.negative_score, 12);
      expect(byId['mft-not'].pass).toBe(false);
      expect(byId['inv-mira'].afterScore).toBeCloseTo(reference.example.named_positive_score, 12);
      expect(byId['inv-mira'].delta).toBeCloseTo(reference.example.name_difference, 12);
      expect(byId['dir-not'].delta).toBe(0);
      expect(byId['dir-not'].pass).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('matches independent case scores and comparisons across all 81 offered configurations', () => {
    const dom = openExample();
    try {
      const configs = JSON.parse(
        dom.window.eval(
          `JSON.stringify(['lexicon','negation','constant'].flatMap(mode=>Array.from({length:9},(_,i)=>i/4).flatMap(bias=>[0,.02,.2].map(tolerance=>({mode,bias,tolerance,rows:runSuite(mode,bias,tolerance)})))))`,
        ),
      );
      const logistic = (value: number) => 1 / (1 + Math.exp(-value));
      for (const { mode, bias, tolerance, rows } of configs) {
        const score = (value: number) => (mode === 'constant' ? 0.25 : logistic(value));
        const negative = mode === 'negation' ? -1 : 1;
        const before = [1, -1, negative, 1, -1, 1, -1].map(score);
        const after = [
          null,
          null,
          null,
          score(1 + bias),
          score(-1 - bias),
          score(negative),
          score(-2),
        ];
        rows.forEach(
          (
            row: {
              beforeScore: number;
              afterScore: number | null;
              delta: number | null;
              pass: boolean;
            },
            i: number,
          ) => {
            expect(row.beforeScore).toBeCloseTo(before[i], 12);
            if (i < 3) {
              expect(row.afterScore).toBeNull();
              expect(row.delta).toBeNull();
              expect(row.pass).toBe(Number(before[i] >= 0.5) === [1, 0, 0][i]);
            } else {
              expect(row.afterScore).toBeCloseTo(after[i]!, 12);
              const delta = after[i]! - before[i];
              expect(row.delta).toBeCloseTo(delta, 12);
              expect(row.pass).toBe(i < 5 ? Math.abs(delta) <= tolerance + 1e-12 : delta <= 1e-12);
            }
          },
        );
      }
      expect(configs).toHaveLength(81);
    } finally {
      dom.window.close();
    }
  });

  it('exposes constant-predictor, weak-relation, and relaxed-assertion loopholes', () => {
    const dom = openExample();
    try {
      const c = JSON.parse(dom.window.eval('JSON.stringify(runSuite("constant",2,0))'));
      expect(
        c
          .filter((r: { type: string; pass: boolean }) => r.type !== 'MFT')
          .every((r: { pass: boolean }) => r.pass),
      ).toBe(true);
      expect(c.find((r: { id: string }) => r.id === 'mft-good').pass).toBe(false);
      for (const [mode, bias, expected] of [
        ['constant', 1, reference.example.constant_passed],
        ['negation', 0, reference.example.patched_without_name_passed],
      ] as const) {
        const counts = JSON.parse(
          dom.window.eval(`JSON.stringify(counts(runSuite('${mode}',${bias},.02)))`),
        );
        expect(
          Object.fromEntries(
            Object.entries(counts).map(([k, v]) => [k, (v as { passed: number }).passed]),
          ),
        ).toEqual(expected);
      }
      const strict = JSON.parse(dom.window.eval('JSON.stringify(runSuite("lexicon",1,.02))'));
      const loose = JSON.parse(dom.window.eval('JSON.stringify(runSuite("lexicon",1,.2))'));
      expect(
        strict.map((r: { beforeScore: number; afterScore: number | null }) => [
          r.beforeScore,
          r.afterScore,
        ]),
      ).toEqual(
        loose.map((r: { beforeScore: number; afterScore: number | null }) => [
          r.beforeScore,
          r.afterScore,
        ]),
      );
      expect(strict[3].pass).toBe(false);
      expect(loose[3].pass).toBe(true);
      expect(Number(strict[3].beforeScore >= 0.5)).toBe(Number(strict[3].afterScore >= 0.5));
      expect(strict[5].pass).toBe(true);
      expect(strict[2].pass).toBe(false);
    } finally {
      dom.window.close();
    }
  });

  it('implements the disclosed token, negation, shortcut, and threshold rules', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('predict("The SERVICE is GOOD!", "lexicon", 0)')).toBeCloseTo(
        reference.example.positive_score,
        12,
      );
      expect(dom.window.eval('predict("not good", "negation", 0)')).toBeCloseTo(
        reference.example.negative_score,
        12,
      );
      expect(dom.window.eval('predict("not very good", "negation", 0)')).toBeCloseTo(
        reference.example.positive_score,
        12,
      );
      expect(dom.window.eval('predict("not bad", "negation", 0)')).toBeCloseTo(
        reference.example.positive_score,
        12,
      );
      expect(dom.window.eval('predict("constructor mystery", "negation", 0)')).toBe(0.5);
      expect(dom.window.eval('predict("", "lexicon", 2)')).toBe(0.5);
      expect(dom.window.eval('predict("Mira Mira good", "lexicon", 1)')).toBeCloseTo(
        1 / (1 + Math.exp(-3)),
        12,
      );
      expect(dom.window.eval('predict("Noor good", "lexicon", 1)')).toBe(0.5);
      expect(dom.window.eval('predict("good great Mira", "constant", 2)')).toBe(0.25);
      expect(
        dom.window.eval(
          `(()=>{suite.push({id:'tie',type:'MFT',before:'unknown',label:1});return runSuite('lexicon',0,.02).at(-1).pass;})()`,
        ),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('recalculates settings, disables the constant rule’s irrelevant control, resizes, and resets', () => {
    const dom = openExample();
    try {
      const document = dom.window.document;
      const change = (id: string, value: string) => {
        const input = document.querySelector('#' + id);
        input.value = value;
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      };
      change('model', 'negation');
      change('bias', '0');
      expect(document.querySelector('output').textContent).toContain(
        'Label tests: 3/3 · Invariance: 2/2 · Direction: 2/2',
      );
      change('model', 'constant');
      expect(document.querySelector('#bias').disabled).toBe(true);
      expect(document.querySelector('#interpretation').textContent).toContain(
        'fails the positive labeled case',
      );
      change('model', 'lexicon');
      change('bias', '1');
      change('tolerance', '0.2');
      expect(document.querySelector('#bias').disabled).toBe(false);
      expect(document.querySelector('output').textContent).toContain('Invariance: 2/2');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(document.querySelector('svg').getAttribute('viewBox')).toBe('0 0 328 810');
      document.querySelector('#reset').click();
      expect(document.querySelector('#model').value).toBe('lexicon');
      expect(document.querySelector('#bias').value).toBe('1');
      expect(document.querySelector('#tolerance').value).toBe('0.02');
      expect(document.querySelector('output').textContent).toContain(
        'Label tests: 2/3 · Invariance: 0/2 · Direction: 2/2',
      );
      expect(document.querySelectorAll('tbody tr')).toHaveLength(7);
      expect(document.querySelector('svg').innerHTML).not.toContain('NaN');
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
    const article = corpus.entities.find((e) => e.id === 'ml-behavioral-testing')!;
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
    expect(rendered).toContain('/assets/machine-learning/behavioral-testing.svg');
    expect(rendered).toContain('/assets/machine-learning/behavioral-testing-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-behavioral-testing.md'), 'utf8');
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

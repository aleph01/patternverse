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
  resolve(root, 'content/assets/widgets/ml-few-shot-in-context-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-few-shot-in-context-learning',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

// Counts calculated independently from the three queries and six reviewed examples.
const fractions = [
  [
    [2, 10],
    [5, 10],
    [2, 12],
    [1, 15],
    [1, 10],
    [0, 13],
  ],
  [
    [1, 9],
    [1, 12],
    [4, 8],
    [2, 12],
    [1, 8],
    [0, 11],
  ],
  [
    [0, 13],
    [2, 14],
    [0, 15],
    [0, 17],
    [0, 12],
    [5, 9],
  ],
];
const instruction =
  'Classify a library request. HOLD = reserve a copy; RENEW = extend an existing loan; FIND = locate or discover books. Return exactly one label.';
describe('Few-Shot In-Context Learning', () => {
  it('reproduces the documented default selection, fractions, label coverage, and exact prompt length', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.selected.map((e: { id: string }) => e.id)).toEqual(['D2', 'D1', 'D3']);
      expect(
        r.selected.map((e: { intersection: number; union: number }) => [e.intersection, e.union]),
      ).toEqual([
        [5, 10],
        [2, 10],
        [2, 12],
      ]);
      expect(r.labels).toEqual(['HOLD', 'RENEW']);
      expect(r.missing).toEqual(['FIND']);
      expect(r.characters).toBe(369);
      expect(r.characters).toBe(reference.example.default_characters);
      expect(r.prompt).toBe(
        instruction +
          '\n\nExamples:\nRequest: Can I keep this book for another week?\nLabel: RENEW\n\nRequest: Renew my loan of Dune.\nLabel: RENEW\n\nRequest: Reserve a copy of Dune for me.\nLabel: HOLD\n\nNew request: Can I renew Dune for another week?\nLabel:',
      );
    } finally {
      dom.window.close();
    }
  });
  it('verifies all 24 selections, orders, prompt contents, and character counts against a separate oracle', () => {
    const dom = openExample();
    let count = 0;
    try {
      for (let q = 0; q < 3; q++)
        for (const k of [0, 1, 3, 6])
          for (const order of ['ranked', 'reverse']) {
            const r = get(dom, `compute(${q},${k},'${order}')`);
            const ranked = reference.example.bank
              .map((e: { id: string; input: string; label: string }, i: number) => ({
                ...e,
                n: fractions[q][i][0],
                d: fractions[q][i][1],
              }))
              .sort(
                (
                  a: { n: number; d: number; id: string },
                  b: { n: number; d: number; id: string },
                ) => b.n / b.d - a.n / a.d || a.id.localeCompare(b.id),
              );
            for (let i = 0; i < 6; i++) {
              expect(r.ranked[i].id).toBe(ranked[i].id);
              expect(r.ranked[i].intersection).toBe(ranked[i].n);
              expect(r.ranked[i].union).toBe(ranked[i].d);
              expect(r.ranked[i].score).toBeCloseTo(ranked[i].n / ranked[i].d, 12);
            }
            const selected = ranked.slice(0, k);
            if (order === 'reverse') selected.reverse();
            const parts = [instruction];
            if (k)
              parts.push(
                'Examples:\n' +
                  selected
                    .map((e: { input: string; label: string }) =>
                      ['Request: ' + e.input, 'Label: ' + e.label].join('\n'),
                    )
                    .join('\n\n'),
              );
            parts.push('New request: ' + reference.example.queries[q] + '\nLabel:');
            const expected = parts.join('\n\n');
            expect(r.selected.map((e: { id: string }) => e.id)).toEqual(
              selected.map((e: { id: string }) => e.id),
            );
            expect(r.prompt).toBe(expected);
            expect(r.characters).toBe(Array.from(expected).length);
            expect(r.labels).toEqual(
              [...new Set(selected.map((e: { label: string }) => e.label))].sort(),
            );
            count++;
          }
      expect(count).toBe(24);
    } finally {
      dom.window.close();
    }
  });
  it('implements the stated lexical sets, empty-set convention, and deterministic ties', () => {
    const dom = openExample();
    try {
      expect(get(dom, "[...wordSet('DUNE, dune! 2 😀')]")).toEqual(['dune']);
      expect(get(dom, "[...wordSet('Le Guin / LE-guin')]")).toEqual(['le', 'guin']);
      expect(get(dom, "overlap('', '')")).toEqual({ intersection: 0, union: 0, score: 0 });
      expect(get(dom, "overlap('book book book', 'book')")).toEqual({
        intersection: 1,
        union: 1,
        score: 1,
      });
      expect(get(dom, "compute(2,6,'ranked').ranked.map(e=>e.id)")).toEqual([
        'D6',
        'D2',
        'D1',
        'D3',
        'D4',
        'D5',
      ]);
      expect(get(dom, "overlap('renew', 'extend')").score).toBe(0);
    } finally {
      dom.window.close();
    }
  });
  it('keeps construction separate from prediction and preserves the selected set when reversing', () => {
    const dom = openExample();
    try {
      for (let q = 0; q < 3; q++) {
        let previous = 0;
        for (const k of [0, 1, 3, 6]) {
          const a = get(dom, `compute(${q},${k},'ranked')`),
            b = get(dom, `compute(${q},${k},'reverse')`);
          expect(b.characters).toBe(a.characters);
          expect(a.characters).toBeGreaterThan(previous);
          previous = a.characters;
          expect(b.selected.map((e: { id: string }) => e.id)).toEqual(
            a.selected.map((e: { id: string }) => e.id).reverse(),
          );
          expect(
            a.prompt.endsWith('New request: ' + reference.example.queries[q] + '\nLabel:'),
          ).toBe(true);
          expect(a.mode).toBe(k === 0 ? 'ZERO-SHOT' : k === 1 ? 'ONE-SHOT' : 'FEW-SHOT');
          expect(a.prompt.includes('Examples:')).toBe(k > 0);
          expect(a).not.toHaveProperty('prediction');
          expect(a).not.toHaveProperty('accuracy');
        }
      }
      expect(get(dom, "compute(0,6,'ranked').labels")).toEqual(['FIND', 'HOLD', 'RENEW']);
    } finally {
      dom.window.close();
    }
  });
  it('updates the exact prompt and ranking positions, then resets controls, details, and phone layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#rank-data tr')).toHaveLength(6);
      change('#shots', '0');
      expect(d.querySelector('output')!.textContent).toContain('ZERO-SHOT');
      expect(d.querySelector('#prompt')!.textContent).not.toContain('Examples:');
      change('#shots', '6');
      expect(d.querySelector('output')!.textContent).toContain('Labels demonstrated: 3/3');
      change('#query', '1');
      change('#order', 'reverse');
      expect(get(dom, 'report.selected.map(e=>e.id)')).toEqual([
        'D6',
        'D2',
        'D1',
        'D5',
        'D4',
        'D3',
      ]);
      (d.querySelector('#bank') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(get(dom, '[report.index,report.k,report.order]')).toEqual([0, 3, 'ranked']);
      expect((d.querySelector('#bank') as HTMLDetailsElement).open).toBe(false);
      expect(d.querySelector('#prompt')!.textContent).toBe(get(dom, 'report.prompt'));
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 810');
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
    const article = corpus.entities.find((e) => e.id === 'ml-few-shot-in-context-learning')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-generative-systems',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/few-shot-in-context-learning.svg');
    expect(rendered).toContain('/assets/machine-learning/few-shot-in-context-learning-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-few-shot-in-context-learning.md'),
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

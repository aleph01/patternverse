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
  resolve(root, 'content/assets/widgets/ml-active-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (pattern: { id: string }) => pattern.id === 'ml-active-learning',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Active Learning worked example', () => {
  it('fits the midpoint of the revealed bounds and chooses the nearest unqueried score', () => {
    const dom = openExample();
    try {
      expect(
        JSON.parse(
          dom.window.eval('JSON.stringify(fit([{x:0,y:0},{x:100,y:1},{x:50,y:0},{x:75,y:1}]))'),
        ),
      ).toEqual({ low: 50, high: 75, cutoff: 62.5 });
      expect(dom.window.eval('choose({cutoff:62.5},[61,62,63,64],"uncertainty",()=>0)')).toBe(62);
      expect(dom.window.eval('choose({cutoff:62.5},[61,63,64],"uncertainty",()=>0)')).toBe(63);
    } finally {
      dom.window.close();
    }
  });

  it('matches the checked query histories and all seven evaluation states', () => {
    const dom = openExample();
    try {
      const active = [],
        random = [];
      for (let round = 0; round <= 6; round++) {
        active.push(
          dom.window.eval(
            'correctCount(fit(session.active.labels),testScores,x=>Number(x>=session.truth))',
          ),
        );
        random.push(
          dom.window.eval(
            'correctCount(fit(session.baseline.labels),testScores,x=>Number(x>=session.truth))',
          ),
        );
        if (round < 6) dom.window.document.querySelector('#next').click();
      }
      expect(active).toEqual([174, 176, 199, 189, 196, 199, 199]);
      expect(random).toEqual([174, 177, 180, 180, 147, 145, 188]);
      expect(active).toEqual(reference.example.active_test_correct);
      expect(random).toEqual(reference.example.random_test_correct);
      expect(
        JSON.parse(dom.window.eval('JSON.stringify(session.active.queries.map(q=>q.x))')),
      ).toEqual(reference.example.active_queries);
      expect(
        JSON.parse(dom.window.eval('JSON.stringify(session.baseline.queries.map(q=>q.x))')),
      ).toEqual(reference.example.random_queries);
      expect(dom.window.document.querySelector('#next').disabled).toBe(true);
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '8 training labels per strategy',
      );
      expect(active[3]).toBeLessThan(active[2]);
    } finally {
      dom.window.close();
    }
  });

  it('keeps the queried training data and evaluation data separate and requests only one label per query', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('testScores.every(x=>!Number.isInteger(x))')).toBe(true);
      const calls = dom.window.eval(
        '(()=>{let n=0;const s=startSession(63,2026);queryOne(s.active,"uncertainty",s.random,x=>{n++;return Number(x>=63)});return n;})()',
      );
      expect(calls).toBe(1);
      const x = dom.window.eval(
        '(()=>{const s=startSession(35,2026);return choose(fit(s.active.labels),s.active.pool,"uncertainty",s.random)})()',
      );
      expect(x).toBe(50);
    } finally {
      dom.window.close();
    }
  });

  it('agrees with direct interval-length error across all offered scenarios and several random seeds', () => {
    const dom = openExample();
    try {
      const checked = dom.window.eval(
        '(()=>{let count=0;for(const truth of [35,63,79])for(const seed of [0,2026,99999]){const s=startSession(truth,seed);for(let i=0;i<=6;i++){for(const state of [s.active,s.baseline]){const model=fit(state.labels);const correct=correctCount(model,testScores,x=>Number(x>=truth));if(correct!==200-2*Math.abs(model.cutoff-truth))throw Error("incorrect evaluation");if(state.labels.some(q=>Number(q.x>=model.cutoff)!==q.y))throw Error("inconsistent fit");if(new Set(state.labels.map(q=>q.x)).size!==state.labels.length)throw Error("repeated query");count++;}if(i<6)advance(s);}}return count;})()',
      );
      expect(checked).toBe(126);
    } finally {
      dom.window.close();
    }
  });

  it('resets, rejects invalid seeds, and recomputes when settings change', () => {
    const dom = openExample();
    try {
      dom.window.document.querySelector('#all').click();
      expect(dom.window.document.querySelectorAll('tbody tr')).toHaveLength(6);
      const seed = dom.window.document.querySelector('#seed');
      seed.value = '-1';
      seed.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain('integer seed');
      expect(dom.window.document.querySelectorAll('svg rect')).toHaveLength(0);
      expect(dom.window.document.querySelectorAll('tbody tr')).toHaveLength(0);
      dom.window.document.querySelector('#reset').click();
      expect(dom.window.document.querySelector('output').textContent).toContain('Round 0/6');
      expect(seed.value).toBe('2026');
      const truth = dom.window.document.querySelector('#truth');
      truth.value = '35';
      truth.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'uncertainty 170/200; random 170/200',
      );
    } finally {
      dom.window.close();
    }
  });

  it('integrates the fixed structure, metadata, illustration, explorer, and guide without a practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-active-learning')!;
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
    expect(rendered).toContain('/assets/machine-learning/active-learning-label-budget.svg');
    expect(rendered).toContain('/assets/machine-learning/active-learning-label-budget-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const markdown = readFileSync(resolve(root, 'content/patterns/ml-active-learning.md'), 'utf8');
    expect([...markdown.matchAll(/^## (.+)$/gm)].map((m) => m[1])).toEqual(
      metadata.article_structure,
    );
    expect(
      markdown
        .replace(/^---\n[\s\S]*?\n---\n/, '')
        .split('## Sources and further reading')[0]
        .split(/\s+/)
        .filter(Boolean).length,
    ).toBe(reference.article_words);
    for (const src of reference.sources) expect(markdown).toContain(src);
  });
});

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
  resolve(root, 'content/assets/widgets/ml-leakage-safe-evaluation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-leakage-safe-evaluation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Leakage-Safe Evaluation worked example', () => {
  it('fits equal-sized visit and customer partitions with the documented scores', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(dom.window.eval('JSON.stringify(comparison)'));
      expect(result.records).toHaveLength(16);
      for (const kind of ['visits', 'groups']) {
        const score = result[kind],
          expected = reference.example[kind];
        expect(score.trainRows).toBe(reference.example.train_rows);
        expect(score.testRows).toBe(reference.example.test_rows);
        expect(score.sharedIds).toHaveLength(expected.shared_ids);
        expect(score.unseenIds).toHaveLength(expected.unseen_ids);
        expect(score.correct).toBe(expected.correct);
        expect(score.baselineCorrect).toBe(expected.baseline_correct);
      }
      expect(result.visits.trainIds).toEqual(result.visits.testIds);
      expect(result.groups.trainIds).toEqual(['A', 'B', 'C', 'D']);
      expect(result.groups.testIds).toEqual(['E', 'F', 'G', 'H']);
      expect(result.groups.predictions.map((p: { prediction: number }) => p.prediction)).toEqual(
        Array(8).fill(0),
      );
    } finally {
      dom.window.close();
    }
  });

  it('does not let held-out targets affect fitted predictions', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(
        dom.window.eval(`JSON.stringify((()=>{
        const records=makeRecords('01010101'), {train,test}=partition(records,'groups','last');
        const before=evaluate(train,test), after=evaluate(train,test.map(r=>({...r,label:1})));
        const model=fit(train);
        return {before,after,known:predict(model,'B'),unknown:predict(model,'E'),training:train};
      })())`),
      );
      expect(result.before.predictions.map((p: { prediction: number }) => p.prediction)).toEqual(
        result.after.predictions.map((p: { prediction: number }) => p.prediction),
      );
      expect(result.before.correct).toBe(4);
      expect(result.after.correct).toBe(0);
      expect(result.known).toBe(1);
      expect(result.unknown).toBe(0);
      expect(
        result.training.every((r: { id: string }) => ['A', 'B', 'C', 'D'].includes(r.id)),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('matches independent majority calculations for all 512 label and customer-half choices', () => {
    const dom = openExample();
    try {
      const results = JSON.parse(
        dom.window.eval(
          `JSON.stringify(Array.from({length:256},(_,n)=>n.toString(2).padStart(8,'0')).flatMap(pattern=>['first','last'].map(heldout=>({pattern,heldout,result:compare(pattern,heldout)}))))`,
        ),
      );
      for (const { pattern, heldout, result } of results) {
        const labels = [...pattern].map(Number);
        const train = heldout === 'last' ? labels.slice(0, 4) : labels.slice(4);
        const test = heldout === 'last' ? labels.slice(4) : labels.slice(0, 4);
        const trainMajority = Number(train.filter((v) => v === 1).length > 2);
        const rowMajority = Number(labels.filter((v) => v === 1).length > 4);
        const correct = 2 * test.filter((v) => v === trainMajority).length;
        expect(result.visits.correct).toBe(8);
        expect(result.visits.baselineCorrect).toBe(labels.filter((v) => v === rowMajority).length);
        expect(result.groups.correct).toBe(correct);
        expect(result.groups.baselineCorrect).toBe(correct);
        expect(result.groups.fallback).toBe(trainMajority);
        expect(result.groups.sharedIds).toEqual([]);
        expect(result.groups.testIds).toHaveLength(4);
        for (const kind of ['visits', 'groups']) {
          expect(result[kind].trainRows).toBe(8);
          expect(result[kind].testRows).toBe(8);
          expect(result[kind].predictions).toHaveLength(8);
        }
        expect(
          new Set(result.records.map((r: { id: string; visit: number }) => r.id + r.visit)).size,
        ).toBe(16);
      }
      expect(results).toHaveLength(512);
    } finally {
      dom.window.close();
    }
  });

  it('verifies feature and label availability and the training-only centering example', () => {
    const { temporal, centering } = reference.example;
    const when = Date.parse(temporal.prediction_time);
    expect(temporal.feature_availability.map((t: string) => Date.parse(t) <= when)).toEqual(
      temporal.usable,
    );
    expect(Date.parse(temporal.label_available)).toBeGreaterThan(Date.parse(temporal.fitting_time));
    const mean = (values: number[]) => values.reduce((s, v) => s + v, 0) / values.length;
    expect(mean(centering.training_values)).toBe(centering.training_mean);
    expect(mean([...centering.training_values, ...centering.test_values])).toBe(
      centering.pooled_mean,
    );
    expect(centering.training_mean).toBe(1);
    expect(centering.pooled_mean).toBe(34);
  });

  it('changes interpretation separately from scores, recalculates edits, clears invalid input, and resets', () => {
    const dom = openExample();
    try {
      const document = dom.window.document;
      const change = (id: string, value: string) => {
        const input = document.querySelector('#' + id);
        input.value = value;
        input.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      };
      const initial = document.querySelector('output').textContent;
      change('question', 'returning');
      expect(document.querySelector('output').textContent).toBe(initial);
      expect(document.querySelector('#interpretation').textContent).toContain('8 familiar IDs');
      change('labels', '00001111');
      expect(document.querySelector('output').textContent).toContain(
        'customer holdout: 0/8 correct (0.0%)',
      );
      change('heldout', 'first');
      expect(JSON.parse(dom.window.eval('JSON.stringify(comparison.groups.trainIds)'))).toEqual([
        'E',
        'F',
        'G',
        'H',
      ]);
      expect(dom.window.eval('comparison.groups.fallback')).toBe(1);
      change('labels', '0101');
      expect(document.querySelector('output').textContent).toContain('exactly eight binary labels');
      expect(document.querySelectorAll('svg rect')).toHaveLength(0);
      expect(document.querySelectorAll('tbody tr')).toHaveLength(0);
      change('labels', '00000000');
      expect(document.querySelector('output').textContent).toContain(
        'customer holdout: 8/8 correct (100.0%)',
      );
      document.querySelector('#reset').click();
      expect(document.querySelector('#question').value).toBe('new');
      expect(document.querySelector('#heldout').value).toBe('last');
      expect(document.querySelector('#labels').value).toBe('01010101');
      expect(document.querySelector('output').textContent).toBe(initial);
      expect(document.querySelectorAll('tbody tr')).toHaveLength(8);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(document.querySelector('svg').getAttribute('viewBox')).toBe('0 0 328 560');
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
    const article = corpus.entities.find((e) => e.id === 'ml-leakage-safe-evaluation')!;
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
    expect(rendered).toContain('/assets/machine-learning/leakage-safe-evaluation.svg');
    expect(rendered).toContain('/assets/machine-learning/leakage-safe-evaluation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-leakage-safe-evaluation.md'),
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
    expect(reference.example_user_queries.length).toBeGreaterThanOrEqual(8);
  });
});

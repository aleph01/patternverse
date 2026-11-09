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
  resolve(root, 'content/assets/widgets/ml-hyperparameter-tuning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-hyperparameter-tuning',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Hyperparameter tuning fits and bounded selection', () => {
  it('fits actual scalar ridge coefficients and independently verifies both validation panels', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'train')).toEqual(reference.example.training);
      expect(read(dom, 'panels')).toEqual(reference.example.panels);
      for (let i = 0; i < 4; i++) {
        const lambda = reference.example.settings[i],
          model = read(dom, `fit(train,${lambda})`);
        expect(model.w).toBeCloseTo(reference.example.coefficients[i], 12);
        expect(read(dom, `evaluate(fit(train,${lambda}),train).mse`)).toBeCloseTo(
          reference.example.training_mse[i],
          12,
        );
        for (const panel of ['A', 'B'])
          expect(read(dom, `evaluate(fit(train,${lambda}),panels.${panel}).mse`)).toBeCloseTo(
            reference.example['panel_' + panel + '_mse'][i],
            12,
          );
        // The derivative of the declared objective must vanish at every fit.
        const derivative =
          reference.example.training.reduce(
            (s: number, [x, y]: number[]) => s + 2 * x * (model.w * x - y),
            0,
          ) +
          2 * lambda * model.w;
        expect(derivative).toBeCloseTo(0, 12);
      }
      const r = read(dom, 'report');
      expect(r.selected.lambda).toBe(2);
      expect(r.selected.w).toBe(1.5);
      expect(r.selected.validation.mse).toBe(0.625);
      expect(r.untried).toEqual([8, 26]);
      expect(r.selected.validation.residuals.map((p: { squared: number }) => p.squared)).toEqual([
        1, 0.25, 0.25, 1,
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('checks all eight searches against independent finite-grid losses and eligibility', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const budget of [2, 4])
        for (const order of ['weak', 'strong'])
          for (const panel of ['A', 'B']) {
            count++;
            const sequence = order === 'weak' ? [0, 2, 8, 26] : [26, 8, 2, 0],
              eligible = sequence.slice(0, budget);
            const weights = new Map([
                [0, 1.8],
                [2, 1.5],
                [8, 1],
                [26, 0.5],
              ]),
              slope = panel === 'A' ? 1 : 1.5;
            const losses = eligible.map((lambda) => ({
              lambda,
              loss: 2.5 * (weights.get(lambda)! - slope) ** 2,
            }));
            const winner = [...losses].sort((a, b) => a.loss - b.loss || a.lambda - b.lambda)[0];
            const r = read(dom, `search(${budget},'${order}','${panel}')`);
            expect(r.trials.map((t: { lambda: number }) => t.lambda)).toEqual(eligible);
            expect(r.selected.lambda).toBe(winner.lambda);
            expect(r.selected.validation.mse).toBeCloseTo(winner.loss, 12);
            expect(r.trials).toHaveLength(budget);
            expect(r.untried).toEqual([0, 2, 8, 26].filter((v) => !eligible.includes(v)));
          }
      expect(count).toBe(8);
      expect(read(dom, "search(4,'weak','A').selected.lambda")).toBe(8);
      expect(read(dom, "search(4,'strong','B').selected.lambda")).toBe(2);
      expect(read(dom, "search(2,'strong','A').selected.lambda")).toBe(8);
    } finally {
      dom.window.close();
    }
  });
  it('keeps validation outcomes out of fitting and rejects invalid contracts without mutating data', () => {
    const dom = openExample();
    try {
      expect(read(dom, "search(4,'weak','A').trials.map(t=>t.w)")).toEqual(
        read(dom, "search(4,'weak','B').trials.map(t=>t.w)"),
      );
      expect(
        read(
          dom,
          'Object.isFrozen(train)&&train.every(Object.isFrozen)&&Object.isFrozen(settings)&&Object.isFrozen(panels.A)',
        ),
      ).toBe(true);
      expect(read(dom, 'fit([[1,2],[2,4]],0).w')).toBe(2);
      expect(read(dom, 'evaluate({w:2},[[1,3],[2,4]]).mse')).toBe(0.5);
      expect(read(dom, 'JSON.stringify(train)')).toBe(JSON.stringify(reference.example.training));
      for (const expression of [
        'fit([],2)',
        'fit([[0,1]],0)',
        'fit([[1,2]],-1)',
        'fit([[1,2]],NaN)',
        'fit([[1,Infinity]],2)',
        'fit([[1e308,2]],2)',
        'evaluate({w:NaN},train)',
        'evaluate({w:1e308},[[2,1]])',
        'search(1)',
        "search(2,'random')",
        "search(2,'weak','test')",
        "search(2,'weak','toString')",
      ])
        expect(() => dom.window.eval(expression)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('independently counts candidate, fold and final fitting work', () => {
    const f = reference.example.grid_work;
    expect(f.penalties * f.feature_configs * f.folds).toBe(f.candidate_fits);
    expect(f.candidate_fits + f.final_refits).toBe(61);
    expect(f.total_fits).toBe(61);
  });
  it('updates every control, exposes calculations, changes the phone drawing and resets', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const el = d.querySelector(id) as HTMLSelectElement;
          el.value = value;
          el.dispatchEvent(new dom.window.Event('change'));
        };
      change('#budget', '4');
      expect(d.querySelector('output')!.textContent).toContain('selected λ 8');
      change('#panel', 'B');
      expect(d.querySelector('output')!.textContent).toContain('selected λ 2');
      change('#budget', '2');
      change('#order', 'strong');
      expect(d.querySelector('output')!.textContent).toContain('selected λ 8');
      expect(d.querySelector('#formula')!.textContent).toContain('18 / (10 + 8) = 1');
      expect(d.querySelectorAll('#trials tbody tr')).toHaveLength(2);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 760');
      for (const el of d.querySelectorAll('details')) (el as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({ budget: 2, order: 'weak', panel: 'A' });
      expect(d.querySelector('output')!.textContent).toContain('validation MSE 0.625');
      for (const el of d.querySelectorAll('details'))
        expect((el as HTMLDetailsElement).open).toBe(false);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-hyperparameter-tuning')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-learning-and-adaptation',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/hyperparameter-tuning.svg');
    expect(rendered).toContain('/assets/machine-learning/hyperparameter-tuning-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-hyperparameter-tuning.md'), 'utf8');
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
    expect(reference.visual.interactive_asset).toBe('ml-hyperparameter-tuning.html');
    expect(reference.collections).toContain('machine-learning-learning-and-adaptation');
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/hyperparameter-tuning' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Selected λ 2');
    }
  });
});

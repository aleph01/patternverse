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
  resolve(root, 'content/assets/widgets/ml-federated-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-federated-learning');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));
type Quadratic = { id: string; n: number; a: number; b: number; c: number };
const quadratics = (feature: number): Quadratic[] => [
  { id: 'A', n: 4, a: 1, b: 1, c: 0.75 },
  { id: 'B', n: 2, a: feature * feature, b: 4 * feature, c: 8.5 },
  { id: 'C', n: 2, a: 1, b: -1, c: 0.5 },
];
function shares(clients: Quadratic[], objective: string) {
  return clients.map((c) =>
    objective === 'examples' ? c.n / clients.reduce((n, c) => n + c.n, 0) : 1 / clients.length,
  );
}
const localSolution = (start: number, c: Quadratic, steps: number) =>
  c.b / c.a + (start - c.b / c.a) * Math.pow(1 - 0.1 * c.a, steps);
function oracle(
  steps: number,
  feature: number,
  objective: string,
  participants: string,
  rounds: number,
) {
  const all = quadratics(feature),
    selected = all.filter(
      (c) => participants === 'all' || (participants !== 'none' && participants.includes(c.id)),
    ),
    weights = shares(selected, objective),
    fullWeights = shares(all, objective);
  const contraction = selected.reduce(
      (v, c, i) => v + weights[i] * Math.pow(1 - 0.1 * c.a, steps),
      0,
    ),
    offset = selected.reduce(
      (v, c, i) => v + weights[i] * (c.b / c.a) * (1 - Math.pow(1 - 0.1 * c.a, steps)),
      0,
    ),
    completed = selected.length ? rounds : 0;
  const w = selected.length
    ? (offset * (1 - Math.pow(contraction, rounds))) / (1 - contraction)
    : 0;
  const central = (clients: Quadratic[], weight: number[]) => {
    const a = clients.reduce((v, c, i) => v + weight[i] * c.a, 0),
      b = clients.reduce((v, c, i) => v + weight[i] * c.b, 0);
    return (b / a) * (1 - Math.pow(1 - 0.1 * a, steps * completed));
  };
  const loss = all.reduce((v, c, i) => v + fullWeights[i] * (0.5 * c.a * w * w - c.b * w + c.c), 0);
  return {
    w,
    selected,
    weights,
    completed,
    selectedReference: selected.length ? central(selected, weights) : null,
    fullReference: central(all, fullWeights),
    loss,
  };
}
describe('Federated Learning article and executable training rounds', () => {
  it('computes the published gradients, weighted model, centralized comparison, and client loss regression', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(
        r.last.local.map((c: { id: string; w: number }) => [c.id, Number(c.w.toFixed(8))]),
      ).toEqual([
        ['A', 0.19],
        ['B', 1.28],
        ['C', -0.19],
      ]);
      expect(r.last.weights.map((c: { value: number }) => c.value)).toEqual([0.5, 0.25, 0.25]);
      for (const [field, key] of [
        ['w', 'default_shared_w'],
        ['fullReference', 'default_centralized_w'],
        ['loss', 'default_loss'],
        ['initialLoss', 'default_initial_loss'],
      ])
        expect(r[field]).toBeCloseTo(reference.example[key], 12);
      expect(r.clientLosses[2].after).toBeCloseTo(reference.example.default_C_final_loss, 12);
      expect(r.loss).toBeLessThan(r.initialLoss);
      expect(r.clientLosses[2].after).toBeGreaterThan(r.clientLosses[2].before);
      expect([r.downloads, r.uploads, r.examplePasses, r.completed]).toEqual([3, 3, 16, 1]);
      expect(get(dom, "simulate(2,2,'clients').w")).toBeCloseTo(1.28 / 3, 12);
      expect(get(dom, "simulate(2,2,'examples','AC').w")).toBeCloseTo(0.19 / 3, 12);
    } finally {
      dom.window.close();
    }
  });
  it('matches independent closed-form quadratic training across all 144 offered configurations', () => {
    const dom = openExample();
    try {
      for (const steps of [1, 2, 5])
        for (const feature of [1, 2])
          for (const objective of ['examples', 'clients'])
            for (const participants of ['all', 'AC', 'BC', 'none'])
              for (const rounds of [1, 3, 10]) {
                const r = get(
                    dom,
                    `simulate(${steps},${feature},'${objective}','${participants}',${rounds})`,
                  ),
                  expected = oracle(steps, feature, objective, participants, rounds);
                for (const field of ['w', 'fullReference', 'loss'] as const)
                  expect(r[field]).toBeCloseTo(expected[field], 10);
                if (expected.selectedReference === null) expect(r.selectedReference).toBeNull();
                else expect(r.selectedReference).toBeCloseTo(expected.selectedReference, 10);
                expect(r.completed).toBe(expected.completed);
                expect(r.history).toHaveLength(rounds);
                expect([r.downloads, r.uploads, r.examplePasses]).toEqual([
                  expected.selected.length * expected.completed,
                  expected.selected.length * expected.completed,
                  expected.selected.reduce((n, c) => n + c.n, 0) * steps * expected.completed,
                ]);
                for (const row of r.history) {
                  expect(row.local.map((c: { id: string }) => c.id)).toEqual(
                    expected.selected.map((c) => c.id),
                  );
                  expect(row.weights.map((c: { value: number }) => c.value)).toEqual(
                    expected.weights,
                  );
                  row.local.forEach(
                    (
                      c: {
                        w: number;
                        trace: { step: number; before: number; gradient: number; after: number }[];
                      },
                      i: number,
                    ) => {
                      expect(c.w).toBeCloseTo(
                        localSolution(row.start, expected.selected[i], steps),
                        11,
                      );
                      expect(c.trace).toHaveLength(steps);
                      for (const step of c.trace) {
                        expect(step.after).toBeCloseTo(
                          localSolution(row.start, expected.selected[i], step.step),
                          11,
                        );
                        expect(step.gradient).toBeCloseTo(
                          expected.selected[i].a * step.before - expected.selected[i].b,
                          11,
                        );
                      }
                    },
                  );
                }
              }
    } finally {
      dom.window.close();
    }
  });
  it('distinguishes objective changes, local-step drift, and missing-population effects', () => {
    const dom = openExample();
    try {
      for (const feature of [1, 2])
        for (const objective of ['examples', 'clients'])
          for (const rounds of [1, 3, 10]) {
            const r = get(dom, `simulate(1,${feature},'${objective}','all',${rounds})`);
            expect(r.w).toBeCloseTo(r.fullReference, 12);
          }
      for (const steps of [1, 2, 5])
        for (const objective of ['examples', 'clients']) {
          const r = get(dom, `simulate(${steps},1,'${objective}','all',3)`);
          expect(r.w).toBeCloseTo(r.fullReference, 12);
        }
      const defaultRound = get(dom, 'report');
      expect(defaultRound.w).not.toBeCloseTo(defaultRound.fullReference, 4);
      const withoutB = get(dom, "simulate(2,2,'examples','AC')");
      expect(withoutB.w).toBeCloseTo(withoutB.selectedReference, 12);
      expect(withoutB.w).not.toBeCloseTo(withoutB.fullReference, 4);
      const examples = get(dom, "simulate(2,2,'examples')"),
        clients = get(dom, "simulate(2,2,'clients')");
      expect(examples.w).not.toBeCloseTo(clients.w, 4);
      expect(clients.last.weights.map((w: { value: number }) => w.value)).toEqual([
        1 / 3,
        1 / 3,
        1 / 3,
      ]);
      const shifted = get(dom, "federatedRound(.7,makeClients(),2,'examples')");
      expect(shifted.end).toBeCloseTo(
        0.7 +
          shifted.local.reduce(
            (n: number, c: { w: number }, i: number) => n + shifted.weights[i].value * (c.w - 0.7),
            0,
          ),
        12,
      );
    } finally {
      dom.window.close();
    }
  });
  it('retains a nonzero model without returns and verifies gradients against finite loss differences', () => {
    const dom = openExample();
    try {
      const empty = get(dom, "federatedRound(1.25,[],5,'examples')");
      expect([empty.success, empty.end, empty.local, empty.weights]).toEqual([false, 1.25, [], []]);
      const none = get(dom, "simulate(5,2,'examples','none',10)");
      expect([
        none.w,
        none.selectedReference,
        none.fullReference,
        none.completed,
        none.downloads,
        none.uploads,
        none.examplePasses,
      ]).toEqual([0, null, 0, 0, 0, 0, 0]);
      expect(none.loss).toBe(2.625);
      expect(get(dom, "objectiveLoss(1,[],'examples')")).toBeNull();
      for (const feature of [1, 2])
        for (const id of ['A', 'B', 'C'])
          for (const w of [-0.5, 0, 0.8, 2]) {
            const g = get(
                dom,
                `gradient(${w},makeClients(${feature}).find(c=>c.id==='${id}').records)`,
              ),
              upper = get(
                dom,
                `localLoss(${w}+.000001,makeClients(${feature}).find(c=>c.id==='${id}').records)`,
              ),
              lower = get(
                dom,
                `localLoss(${w}-.000001,makeClients(${feature}).find(c=>c.id==='${id}').records)`,
              );
            expect(g).toBeCloseTo((upper - lower) / 0.000002, 7);
          }
    } finally {
      dom.window.close();
    }
  });
  it('updates the round history and raw local steps, then resets all controls and responsive layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      expect(d.querySelectorAll('#step-data tr')).toHaveLength(6);
      expect(d.querySelectorAll('#losses tr')).toHaveLength(3);
      expect(d.querySelectorAll('#metrics tr')).toHaveLength(7);
      change('#rounds', '3');
      expect(d.querySelectorAll('#history tr')).toHaveLength(3);
      expect(d.querySelectorAll('#step-data tr')).toHaveLength(18);
      change('#participants', 'none');
      expect(d.querySelector('output')!.textContent).toContain('NO UPDATE');
      expect(d.querySelector('output')!.textContent).toContain('returned clients: undefined');
      expect(d.querySelector('#interpretation')!.textContent).toContain('retains its model');
      expect(d.querySelectorAll('#step-data tr')).toHaveLength(0);
      change('#participants', 'BC');
      change('#steps', '5');
      change('#feature', '1');
      change('#objective', 'clients');
      (d.querySelector('#records') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(
        get(
          dom,
          '[report.steps,report.feature,report.objective,report.participants,report.rounds]',
        ),
      ).toEqual([2, 2, 'examples', 'all', 1]);
      expect((d.querySelector('#records') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 750');
      expect(d.querySelector('#mechanism')!.textContent).toContain('Example-weighted w 0.36750');
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
    const article = corpus.entities.find((e) => e.id === 'ml-federated-learning')!;
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
    expect(rendered).toContain('/assets/machine-learning/federated-learning.svg');
    expect(rendered).toContain('/assets/machine-learning/federated-learning-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-federated-learning.md'), 'utf8');
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

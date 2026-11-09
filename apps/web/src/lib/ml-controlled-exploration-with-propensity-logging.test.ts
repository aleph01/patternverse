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
  resolve(root, 'content/assets/widgets/ml-controlled-exploration-with-propensity-logging.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-controlled-exploration-with-propensity-logging',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));
const draws = [0.05, 0.25, 0.85, 0.45, 0.95, 0.15, 0.35, 0.65, 0.85, 0.75];
const rewards: Record<string, number[]> = {
  A: [1, 0, 1, 1, 0, 0, 0, 1, 0, 0],
  B: [0, 1, 0, 0, 1, 1, 1, 0, 1, 1],
  C: [0, 0, 1, 0, 0, 0, 1, 0, 0, 1],
};
function oracle(epsilon: number, eligible: string, target: string, cap: number) {
  const size = eligible.length,
    explore = epsilon / size,
    prefer = (size - (size - 1) * epsilon) / size;
  const actions = draws.map((u) =>
    u < prefer ? 'A' : eligible === 'AB' || u < prefer + explore ? 'B' : 'C',
  );
  const desired = draws.map((_, i) => (target === 'contextual' ? (i < 5 ? 'A' : 'B') : target));
  const probs: Record<string, number> = {
    A: prefer,
    B: explore,
    C: eligible === 'ABC' ? explore : 0,
  };
  const p = actions.map((a) => probs[a]),
    observed = actions.map((a, i) => rewards[a][i]);
  const weights = actions.map((a, i) => (a === desired[i] ? 1 / p[i] : 0));
  const supported = desired.every((a) => probs[a] > 0),
    sum = weights.reduce((a, b) => a + b, 0),
    weighted = weights.reduce((a, w, i) => a + w * observed[i], 0),
    squares = weights.reduce((a, w) => a + w * w, 0);
  return {
    actions,
    p,
    observed,
    weights,
    supported,
    matches: weights.filter((w) => w > 0).length,
    weightSum: sum,
    rewardSum: weighted,
    ips: supported ? weighted / 10 : null,
    snips: supported && sum ? weighted / sum : null,
    cappedIPS: supported
      ? weights.reduce((a, w, i) => a + Math.min(w, cap) * observed[i], 0) / 10
      : null,
    ess: squares ? (sum * sum) / squares : 0,
    observedMean: observed.reduce((a, b) => a + b, 0) / 10,
  };
}
describe('Controlled Exploration with Propensity Logging article and executable evidence', () => {
  it('computes the published distribution, actual action log, and all four matching contributions', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.supported).toBe(true);
      expect(r.matches).toBe(4);
      for (const a of ['A', 'B', 'C'])
        expect(r.p[a]).toBeCloseTo(reference.example.default_probabilities[a], 12);
      expect(r.rows.map((row: { action: string }) => row.action)).toEqual(
        reference.example.default_actions,
      );
      expect(
        r.rows
          .filter((row: { weight: number }) => row.weight > 0)
          .map((row: { id: string }) => row.id),
      ).toEqual(['R01', 'R02', 'R04', 'R09']);
      for (const [field, key] of [
        ['weightSum', 'default_weight_sum'],
        ['rewardSum', 'default_weighted_reward_sum'],
        ['ips', 'default_ips'],
        ['snips', 'default_snips'],
        ['ess', 'default_weight_concentration'],
        ['observedMean', 'default_observed_reward_mean'],
      ])
        expect(r[field]).toBeCloseTo(reference.example[key], 12);
      expect(r.ips).toBeGreaterThan(1);
      expect(r.snips).toBeCloseTo(10 / 11, 12);
      expect(get(dom, "simulate(.3,'ABC','contextual',2).cappedIPS")).toBeCloseTo(0.45, 12);
    } finally {
      dom.window.close();
    }
  });
  it('matches an independent sampler and estimator across all 96 offered input combinations', () => {
    const dom = openExample();
    try {
      for (const epsilon of [0, 0.1, 0.3, 1])
        for (const eligible of ['ABC', 'AB'])
          for (const target of ['contextual', 'A', 'B', 'C'])
            for (const cap of [Infinity, 2, 5]) {
              const r = get(dom, `simulate(${epsilon},'${eligible}','${target}',${cap})`),
                expected = oracle(epsilon, eligible, target, cap);
              expect(r.supported).toBe(expected.supported);
              expect(r.matches).toBe(expected.matches);
              expect(r.rows.map((row: { action: string }) => row.action)).toEqual(expected.actions);
              for (const key of [
                'weightSum',
                'rewardSum',
                'ips',
                'snips',
                'cappedIPS',
                'ess',
                'observedMean',
              ] as const) {
                if (expected[key] === null) expect(r[key]).toBeNull();
                else expect(r[key]).toBeCloseTo(expected[key], 10);
              }
              r.rows.forEach(
                (
                  row: {
                    propensity: number;
                    reward: number;
                    weight: number;
                    eligible: string[];
                    policy: string;
                  },
                  i: number,
                ) => {
                  expect(row.propensity).toBeGreaterThan(0);
                  expect(row.propensity).toBeCloseTo(expected.p[i], 12);
                  expect(row.reward).toBe(expected.observed[i]);
                  expect(row.weight).toBeCloseTo(expected.weights[i], 10);
                  expect(row.eligible).toEqual(eligible.split(''));
                  expect(row.policy).toBe('v1');
                },
              );
            }
    } finally {
      dom.window.close();
    }
  });
  it('conserves probability and samples exact interval boundaries without selecting zero-probability actions', () => {
    const dom = openExample();
    try {
      for (const epsilon of [0, 0.1, 0.3, 1])
        for (const eligible of ['ABC', 'AB']) {
          const p = get(dom, `probabilities(${epsilon},'${eligible}')`);
          expect(p.A + p.B + p.C).toBeCloseTo(1, 14);
          expect(get(dom, `selectAction(0,probabilities(${epsilon},'${eligible}'))`)).toBe('A');
          expect(get(dom, `selectAction(.999999,probabilities(${epsilon},'${eligible}'))`)).toBe(
            epsilon === 0 ? 'A' : eligible === 'ABC' ? 'C' : 'B',
          );
        }
      expect(get(dom, "selectAction(.95,probabilities(.1,'AB'))")).toBe('B');
      expect(get(dom, "selectAction(.85,probabilities(.3,'AB'))")).toBe('B');
      expect(get(dom, 'selectAction(.8,{A:.8,B:.1,C:.1})')).toBe('B');
      expect(get(dom, 'selectAction(.9,{A:.8,B:.1,C:.1})')).toBe('C');
      expect(get(dom, 'selectAction(0,{A:0,B:.5,C:.5})')).toBe('B');
      expect(() => get(dom, 'selectAction(1,{A:.8,B:.1,C:.1})')).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('blocks unsupported targets, preserves no-match uncertainty, and uses only observed rewards', () => {
    const dom = openExample();
    try {
      const noSupport = get(dom, "simulate(0,'ABC','contextual',2)");
      expect([
        noSupport.supported,
        noSupport.matches,
        noSupport.ips,
        noSupport.snips,
        noSupport.cappedIPS,
      ]).toEqual([false, 5, null, null, null]);
      expect(noSupport.gaps).toEqual(['Complex → B']);
      const absent = get(dom, "simulate(.1,'ABC','C')");
      expect([absent.supported, absent.matches, absent.ips, absent.snips, absent.ess]).toEqual([
        true,
        0,
        0,
        null,
        0,
      ]);
      const excluded = get(dom, "simulate(1,'AB','C')");
      expect(excluded.supported).toBe(false);
      expect(excluded.gaps).toEqual(['Routine → C', 'Complex → C']);
      const log = get(dom, "makeLog(.3,'ABC')"),
        before = get(dom, "evaluate(makeLog(.3,'ABC'),probabilities(.3,'ABC'),'contextual',2)");
      dom.window.eval(
        'fixture.forEach(row=>{row.rewards.A=999;row.rewards.B=999;row.rewards.C=999})',
      );
      const after = get(
        dom,
        `evaluate(${JSON.stringify(log)},probabilities(.3,'ABC'),'contextual',2)`,
      );
      expect(after).toEqual(before);
      const changed = get(
        dom,
        `evaluate(${JSON.stringify(log.map((row: { reward: number }) => ({ ...row, reward: 0 })))},probabilities(.3,'ABC'),'contextual',2)`,
      );
      expect([changed.ips, changed.snips, changed.cappedIPS]).toEqual([0, 0, 0]);
      const raw = get(dom, 'simulate()'),
        capped = get(dom, "simulate(.3,'ABC','contextual',2)");
      expect([raw.ips, raw.snips, raw.ess]).toEqual([capped.ips, capped.snips, capped.ess]);
    } finally {
      dom.window.close();
    }
  });
  it('updates support and clipping warnings, shows the ledger, and resets both layouts', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      expect(d.querySelectorAll('#data tr')).toHaveLength(10);
      expect(d.querySelector('#truth')!.textContent).toContain('0.700');
      change('#cap', '2');
      expect(d.querySelector('#metrics')!.textContent).toContain('0.450');
      change('#epsilon', '0');
      expect(d.querySelector('output')!.textContent).toContain('IPS: blocked');
      expect(d.querySelector('#interpretation')!.textContent).toContain(
        'zero selection probability',
      );
      change('#epsilon', '0.1');
      change('#target', 'C');
      expect(d.querySelector('output')!.textContent).toContain('IPS: 0.000. SNIPS: undefined');
      expect(d.querySelector('#interpretation')!.textContent).toContain('absent evidence');
      change('#eligible', 'AB');
      expect(d.querySelector('output')!.textContent).toContain('Support: no');
      (d.querySelector('#potential') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(get(dom, '[report.epsilon,report.eligible,report.target,report.cap]')).toEqual([
        0.3,
        'ABC',
        'contextual',
        null,
      ]);
      expect((d.querySelector('#potential') as HTMLDetailsElement).open).toBe(false);
      expect(d.querySelectorAll('#metrics tr')).toHaveLength(8);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 730');
      expect(d.querySelector('#mechanism')!.textContent).toContain('IPS 1.250 · SNIPS 0.909');
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
    const article = corpus.entities.find(
      (e) => e.id === 'ml-controlled-exploration-with-propensity-logging',
    )!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-decisions-and-feedback',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain(
      '/assets/machine-learning/controlled-exploration-with-propensity-logging.svg',
    );
    expect(rendered).toContain(
      '/assets/machine-learning/controlled-exploration-with-propensity-logging-mobile.svg',
    );
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-controlled-exploration-with-propensity-logging.md'),
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

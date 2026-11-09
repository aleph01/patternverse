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
  resolve(root, 'content/assets/widgets/ml-off-policy-evaluation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-off-policy-evaluation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));
const rewards: Record<string, number[]> = {
  A: [1, 1, 0, 1, 0, 0, 1, 0],
  B: [0, 1, 0, 1, 1, 0, 1, 0],
};
const targetAt = (i: number, target: string) =>
  target === 'contextual' ? (i < 4 ? 'A' : 'B') : target;
function prediction(i: number, action: string, model: string) {
  return model === 'oracle'
    ? rewards[action][i]
    : model === 'flat'
      ? 0.5
      : i < 4
        ? action === 'A'
          ? 0.6
          : 0.4
        : action === 'A'
          ? 0.3
          : 0.8;
}
function independentSample(
  actions: string[],
  target: string,
  model: string,
  propensity: string,
  coverage: string,
) {
  const supported = coverage === 'mixed' || target === 'A';
  let dm = 0,
    ips = 0,
    dr = 0,
    delta = 0,
    sum = 0,
    squares = 0,
    matches = 0;
  const rows = actions.map((action, i) => {
    const trueP = coverage === 'A-only' ? 1 : action === 'A' ? 0.8 : 0.2,
      usedP = propensity === 'uniform' ? 0.5 : trueP,
      chosen = targetAt(i, target),
      q = prediction(i, chosen, model),
      observedQ = prediction(i, action, model),
      reward = rewards[action][i],
      weight = action === chosen ? 1 / usedP : 0,
      correction = weight * (reward - observedQ);
    dm += q;
    ips += weight * reward;
    dr += q + correction;
    delta += correction;
    sum += weight;
    squares += weight * weight;
    if (weight) matches++;
    return {
      weight,
      correction,
      drRow: q + correction,
      baseline: q,
      observedPrediction: observedQ,
      reward,
    };
  });
  return {
    rows,
    supported,
    dm: dm / 8,
    ips: supported ? ips / 8 : null,
    dr: supported ? dr / 8 : null,
    correction: supported ? delta / 8 : null,
    matches,
    ess: squares ? (sum * sum) / squares : 0,
  };
}
// Exhaustive independent oracle: every one of the 2^8 logger-action histories receives its true probability.
function enumerateExpected(target: string, model: string, propensity: string, coverage: string) {
  let dm = 0,
    ips = 0,
    dr = 0,
    mass = 0;
  const supported = coverage === 'mixed' || target === 'A';
  for (let mask = 0; mask < 256; mask++) {
    const actions = Array.from({ length: 8 }, (_, i) => (mask & (1 << i) ? 'B' : 'A'));
    const probability = actions.reduce(
      (p, a) => p * (coverage === 'A-only' ? (a === 'A' ? 1 : 0) : a === 'A' ? 0.8 : 0.2),
      1,
    );
    if (!probability) continue;
    const sample = independentSample(actions, target, model, propensity, coverage);
    mass += probability;
    dm += probability * sample.dm;
    if (supported) {
      ips += probability * sample.ips!;
      dr += probability * sample.dr!;
    }
  }
  return {
    dm,
    ips: supported ? ips : null,
    dr: supported ? dr : null,
    mass,
    truth:
      Array.from({ length: 8 }, (_, i) => rewards[targetAt(i, target)][i]).reduce(
        (a, b) => a + b,
        0,
      ) / 8,
  };
}
describe('Off-Policy Evaluation article and executable estimators', () => {
  it('computes the published baseline, weighted residual, rare row, and sample estimates', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      for (const [field, key] of [
        ['dm', 'default_dm'],
        ['ips', 'default_ips'],
        ['dr', 'default_dr'],
        ['correction', 'default_correction'],
        ['ess', 'default_weight_concentration'],
      ])
        expect(r[field]).toBeCloseTo(reference.example[key], 12);
      expect([r.supported, r.n, r.matches, r.maxWeight]).toEqual([true, 8, 4, 5]);
      expect(r.rows.map((row: { action: string }) => row.action)).toEqual(
        reference.example.mixed_actions,
      );
      expect(r.rows[7].drRow).toBeCloseTo(-3.2, 12);
      expect(r.rows[7].correction).toBe(-4);
      expect(r.dm + r.correction).toBeCloseTo(r.dr, 14);
      expect([r.expectation.ips, r.expectation.dr, r.expectation.truth]).toEqual([
        0.625, 0.625, 0.625,
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('matches independent sample arithmetic and all-history expectations for all 36 configurations', () => {
    const dom = openExample();
    try {
      for (const target of ['contextual', 'A', 'B'])
        for (const model of ['approximate', 'flat', 'oracle'])
          for (const propensity of ['logged', 'uniform'])
            for (const coverage of ['mixed', 'A-only']) {
              const r = get(dom, `simulate('${target}','${model}','${propensity}','${coverage}')`),
                actions =
                  coverage === 'mixed'
                    ? ['A', 'A', 'A', 'B', 'A', 'A', 'A', 'B']
                    : Array(8).fill('A'),
                sample = independentSample(actions, target, model, propensity, coverage),
                expected = enumerateExpected(target, model, propensity, coverage);
              expect(r.supported).toBe(sample.supported);
              expect(r.matches).toBe(sample.matches);
              expect(r.rows).toHaveLength(8);
              for (const field of ['dm', 'ips', 'dr', 'correction', 'ess'] as const) {
                if (sample[field] === null) expect(r[field]).toBeNull();
                else expect(r[field]).toBeCloseTo(sample[field], 11);
              }
              for (const field of ['dm', 'ips', 'dr', 'truth'] as const) {
                if (expected[field] === null) expect(r.expectation[field]).toBeNull();
                else expect(r.expectation[field]).toBeCloseTo(expected[field], 11);
              }
              expect(expected.mass).toBeCloseTo(1, 12);
              sample.rows.forEach((row, i) => {
                for (const field of [
                  'weight',
                  'correction',
                  'drRow',
                  'baseline',
                  'observedPrediction',
                  'reward',
                ] as const)
                  expect(r.rows[i][field]).toBeCloseTo(row[field], 12);
              });
            }
    } finally {
      dom.window.close();
    }
  });
  it('demonstrates double robustness in expectation while permitting negative corrected rows', () => {
    const dom = openExample();
    try {
      for (const target of ['contextual', 'A', 'B'])
        for (const model of ['approximate', 'flat', 'oracle']) {
          const r = get(dom, `simulate('${target}','${model}','logged','mixed')`);
          expect(r.expectation.dr).toBeCloseTo(r.expectation.truth, 12);
          expect(r.expectation.ips).toBeCloseTo(r.expectation.truth, 12);
        }
      for (const target of ['contextual', 'A', 'B'])
        for (const propensity of ['logged', 'uniform']) {
          const r = get(dom, `simulate('${target}','oracle','${propensity}','mixed')`);
          expect(r.dr).toBeCloseTo(r.expectation.truth, 12);
          expect(r.expectation.dr).toBeCloseTo(r.expectation.truth, 12);
        }
      const wrong = get(dom, "simulate('contextual','approximate','uniform','mixed')");
      expect(wrong.expectation.ips).toBeCloseTo(0.7, 12);
      expect(wrong.expectation.dr).toBeCloseTo(0.76, 12);
      expect(wrong.dr).toBeCloseTo(0.55, 12);
      const extreme = get(
        dom,
        "estimate([{id:'X',context:'Complex',action:'B',reward:0,propensity:.01,probabilities:{A:.99,B:.01}}],{X:{A:0,B:1}},'B','logged')",
      );
      expect(extreme.dr).toBe(-99);
    } finally {
      dom.window.close();
    }
  });
  it('blocks unsupported weighting and isolates logged-data estimation from synthetic counterfactual outcomes', () => {
    const dom = openExample();
    try {
      const unsupported = get(dom, "simulate('contextual','approximate','logged','A-only')");
      expect([unsupported.supported, unsupported.dm, unsupported.ips, unsupported.dr]).toEqual([
        false,
        0.7,
        null,
        null,
      ]);
      expect(unsupported.gaps).toEqual(['Complex → B']);
      const allA = get(dom, "simulate('A','approximate','logged','A-only')");
      expect(allA.supported).toBe(true);
      expect(allA.ips).toBeCloseTo(0.5, 12);
      expect(allA.dr).toBeCloseTo(0.5, 12);
      const log = get(dom, "makeLog('mixed')"),
        predictions = get(dom, "makePredictions('approximate')"),
        before = get(dom, "estimate(makeLog('mixed'),makePredictions('approximate'))");
      dom.window.eval('fixture.forEach(row=>{row.potential.A=999;row.potential.B=999})');
      const after = get(dom, `estimate(${JSON.stringify(log)},${JSON.stringify(predictions)})`);
      expect(after).toEqual(before);
      const changed = get(
        dom,
        `estimate(${JSON.stringify(log.map((row: { reward: number }) => ({ ...row, reward: 0 })))},${JSON.stringify(predictions)})`,
      );
      expect(changed.ips).toBe(0);
      expect(changed.dr).not.toBe(before.dr);
      expect(get(dom, "makeLog('mixed').map(r=>[r.action,r.propensity])")).toEqual(
        log.map((row: { action: string; propensity: number }) => [row.action, row.propensity]),
      );
    } finally {
      dom.window.close();
    }
  });
  it('updates extrapolation warnings and toy expectations, then resets the model and both layouts', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      expect(d.querySelectorAll('#data tr')).toHaveLength(8);
      expect(d.querySelectorAll('#metrics tr')).toHaveLength(3);
      expect(d.querySelector('#truth')!.textContent).toContain('0.62500');
      change('#propensity', 'uniform');
      expect(d.querySelector('output')!.textContent).toContain('DR: 0.55000');
      expect(d.querySelector('#expectation-data')!.textContent).toContain('0.76000');
      change('#model', 'oracle');
      expect(d.querySelector('output')!.textContent).toContain('DR: 0.62500');
      change('#coverage', 'A-only');
      expect(d.querySelector('output')!.textContent).toContain('IPS: blocked');
      expect(d.querySelector('#metrics')!.textContent).toContain('extrapolation');
      change('#target', 'A');
      change('#propensity', 'logged');
      expect(get(dom, 'report.dr')).toBe(0.5);
      change('#model', 'flat');
      (d.querySelector('#expectation') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(get(dom, '[report.target,report.model,report.propensity,report.coverage]')).toEqual([
        'contextual',
        'approximate',
        'logged',
        'mixed',
      ]);
      expect((d.querySelector('#expectation') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 740');
      expect(d.querySelector('#mechanism')!.textContent).toContain('DR 0.231');
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
    const article = corpus.entities.find((e) => e.id === 'ml-off-policy-evaluation')!;
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
    expect(rendered).toContain('/assets/machine-learning/off-policy-evaluation.svg');
    expect(rendered).toContain('/assets/machine-learning/off-policy-evaluation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-off-policy-evaluation.md'), 'utf8');
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

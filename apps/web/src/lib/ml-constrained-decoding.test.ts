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
  resolve(root, 'content/assets/widgets/ml-constrained-decoding.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-constrained-decoding');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

const tokenPieces = [
  '{"label":',
  '"HOLD"',
  '"RENEW"',
  '"FIND"',
  '}',
  'Sure!',
  '"RE',
  'NEW"',
  '"RENEW"}',
  null,
];
const accepted = ['{"label":"HOLD"}', '{"label":"RENEW"}', '{"label":"FIND"}'];
// Hand-enumerated grammar states and legal IDs, independent of startsWith masking.
const masks: Record<string, number[]> = {
  '': [0],
  '{"label":': [1, 2, 3, 6, 8],
  '{"label":"RE': [7],
  '{"label":"HOLD"': [4],
  '{"label":"RENEW"': [4],
  '{"label":"FIND"': [4],
  '{"label":"HOLD"}': [9],
  '{"label":"RENEW"}': [9],
  '{"label":"FIND"}': [9],
  '{"label":"CANCEL': [],
};
const weights = [
  [15, 20, 10, 5, 5, 25, 8, 4, 6, 2],
  [10, 5, 15, 5, 10, 10, 5, 5, 30, 5],
];
// Complete constrained greedy paths by prefix and weight profile, before budget cuts.
const paths = [
  [
    [0, 1, 4, 9],
    [0, 8, 9],
  ],
  [
    [1, 4, 9],
    [8, 9],
  ],
  [
    [7, 4, 9],
    [7, 4, 9],
  ],
  [
    [4, 9],
    [4, 9],
  ],
  [[9], [9]],
  [[], []],
];
describe('Constrained Decoding', () => {
  it('reproduces the default legal support, retained mass, probabilities, greedy output, and human-reference distinction', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(
        r.initial.rows
          .filter((t: { allowed: boolean }) => t.allowed)
          .map((t: { id: number }) => t.id),
      ).toEqual([1, 2, 3, 6, 8]);
      expect(r.initial.grammarMass).toBe(0.49);
      expect(r.initial.rows[1].probability).toBe(20 / 49);
      expect(r.initial.rows[5].base).toBe(0.25);
      expect(r.initial.rows[5].probability).toBe(0);
      expect(r.trace.map((t: { id: number }) => t.id)).toEqual([1, 4, 9]);
      expect(r.text).toBe('{"label":"HOLD"}');
      expect(r.status).toBe('FINISHED');
      expect(r.accepted).toBe(true);
      expect(r.terminated).toBe(true);
      expect(JSON.parse(r.text).label).not.toBe(reference.example.human_reference);
      expect(r.text).toBe(reference.example.default_text);
      expect(r.initial.grammarMass).toBe(reference.example.default_retained_mass);
      expect(get(dom, 'vocabulary')).toEqual(reference.example.vocabulary);
      expect(get(dom, 'profiles')).toEqual(reference.example.weight_profiles);
      expect(get(dom, 'targets')).toEqual(reference.example.targets);
    } finally {
      dom.window.close();
    }
  });
  it('checks every offered greedy run against 72 independently enumerated paths and budget outcomes', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (let prefix = 0; prefix < 6; prefix++)
        for (let profile = 0; profile < 2; profile++)
          for (const constrained of [true, false])
            for (const budget of [1, 3, 5]) {
              const r = get(dom, `compute(${prefix},${profile},${constrained},${budget})`);
              const expected = constrained
                ? paths[prefix][profile].slice(0, budget)
                : Array(budget).fill(profile === 0 ? 5 : 8);
              const text =
                reference.example.prefixes[prefix] +
                expected
                  .filter((id: number) => id !== 9)
                  .map((id: number) => tokenPieces[id])
                  .join('');
              expect(r.trace.map((t: { id: number }) => t.id)).toEqual(expected);
              expect(r.text).toBe(text);
              expect(r.terminated).toBe(expected.includes(9));
              expect(r.accepted).toBe(accepted.includes(text));
              expect(r.status).toBe(
                constrained && prefix === 5
                  ? 'DEAD_END'
                  : expected.includes(9)
                    ? 'FINISHED'
                    : 'TOKEN_LIMIT',
              );
              expect(r.trace.length).toBeLessThanOrEqual(budget);
              for (const t of r.trace) {
                const allowed = masks[t.before] || [],
                  denominator = constrained
                    ? allowed.reduce((s: number, id: number) => s + weights[profile][id], 0)
                    : 100;
                expect(t.probability).toBeCloseTo(weights[profile][t.id] / denominator, 12);
                if (constrained) expect(allowed).toContain(t.id);
              }
              count++;
            }
      expect(count).toBe(72);
      expect(count).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('verifies whole-token transitions, all reachable masks, EOS placement, normalization, and alternative tokenizations', () => {
    const dom = openExample();
    try {
      for (const [prefix, allowed] of Object.entries(masks))
        for (let profile = 0; profile < 2; profile++)
          for (const constrained of [true, false]) {
            const r = get(
                dom,
                `analyze(${JSON.stringify(prefix)},profiles[${profile}],${constrained})`,
              ),
              retained = allowed.reduce((s, id) => s + weights[profile][id], 0);
            expect(
              r.rows
                .filter((t: { allowed: boolean }) => t.allowed)
                .map((t: { id: number }) => t.id),
            ).toEqual(allowed);
            expect(r.grammarMass).toBe(retained / 100);
            expect(r.allowedCount).toBe(allowed.length);
            expect(
              r.rows.reduce((s: number, t: { probability: number }) => s + t.probability, 0),
            ).toBeCloseTo(constrained && !retained ? 0 : 1, 12);
            for (const t of r.rows) {
              expect(t.base).toBe(weights[profile][t.id] / 100);
              expect(t.probability).toBe(
                constrained
                  ? allowed.includes(t.id)
                    ? weights[profile][t.id] / retained
                    : 0
                  : weights[profile][t.id] / 100,
              );
            }
          }
      const allPaths = [
          [0, 1, 4, 9],
          [0, 2, 4, 9],
          [0, 6, 7, 4, 9],
          [0, 8, 9],
          [0, 3, 4, 9],
        ],
        outputs = [];
      for (const path of allPaths) {
        let prefix = '';
        for (const id of path) {
          expect(masks[prefix]).toContain(id);
          if (id !== 9) prefix += tokenPieces[id];
        }
        outputs.push(prefix);
      }
      expect(new Set(outputs)).toEqual(new Set(accepted));
      expect(outputs.filter((s) => s === '{"label":"RENEW"}')).toHaveLength(3);
      expect(get(dom, 'analyze(prefixes[1],profiles[0],true).rows[9].probability')).toBe(0);
      expect(get(dom, 'analyze(prefixes[4],profiles[0],true).rows[9].probability')).toBe(1);
      expect(get(dom, 'choose(analyze(prefixes[1],[0,1,1,0,0,0,0,0,0,0],true).rows).id')).toBe(1);
    } finally {
      dom.window.close();
    }
  });
  it('distinguishes accepted text from EOS termination and handles zero support without bypass or fabricated model confidence', () => {
    const dom = openExample();
    try {
      const closed = get(dom, 'compute(1,1,true,1)'),
        ended = get(dom, 'compute(4,0,true,1)'),
        partial = get(dom, 'compute(0,0,true,1)');
      expect(closed.text).toBe('{"label":"RENEW"}');
      expect(closed.accepted).toBe(true);
      expect(closed.terminated).toBe(false);
      expect(closed.status).toBe('TOKEN_LIMIT');
      expect(ended.accepted).toBe(true);
      expect(ended.terminated).toBe(true);
      expect(ended.trace).toHaveLength(1);
      expect(partial.viable).toBe(true);
      expect(partial.accepted).toBe(false);
      expect(partial.text).toBe('{"label":');
      const zero = get(
        dom,
        '(()=>{profiles.push([1,0,0,0,1,1,0,1,0,1]);return compute(1,2,true,5);})()',
      );
      expect(zero.initial.allowedCount).toBe(5);
      expect(zero.initial.grammarMass).toBe(0);
      expect(zero.status).toBe('DEAD_END');
      expect(zero.trace).toEqual([]);
      expect(zero.text).toBe('{"label":');
      expect(get(dom, "analyze('',Array(10).fill(0),true).rows.map(t=>t.probability)")).toEqual(
        Array(10).fill(0),
      );
      for (const key of ['accuracy', 'model_reply', 'confidence', 'reference_label'])
        expect(closed).not.toHaveProperty(key);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
    } finally {
      dom.window.close();
    }
  });
  it('updates masks, complete-but-unterminated and dead-end states, then resets every input, details, and responsive layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#distribution-data tr')).toHaveLength(10);
      expect(d.querySelector('#result')!.textContent).toBe('{"label":"HOLD"}');
      change('#profile', '1');
      expect(d.querySelector('#result')!.textContent).toBe('{"label":"RENEW"}');
      change('#budget', '1');
      expect(d.querySelector('output')!.textContent).toContain('TOKEN_LIMIT');
      expect(d.querySelector('#interpretation')!.textContent).toContain(
        'already an accepted object',
      );
      change('#prefix', '5');
      expect(d.querySelector('output')!.textContent).toContain('DEAD_END. 0');
      expect(d.querySelector('#trace')!.textContent).toContain('No token emitted');
      change('#mode', 'off');
      expect(d.querySelector('output')!.textContent).toContain('TOKEN_LIMIT. 1');
      (d.querySelector('#language') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(get(dom, '[report.preset,report.profile,report.constrained,report.budget]')).toEqual([
        1,
        0,
        true,
        3,
      ]);
      expect((d.querySelector('#language') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 930');
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
    const article = corpus.entities.find((e) => e.id === 'ml-constrained-decoding')!;
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
    expect(rendered).toContain('/assets/machine-learning/constrained-decoding.svg');
    expect(rendered).toContain('/assets/machine-learning/constrained-decoding-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-constrained-decoding.md'), 'utf8');
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

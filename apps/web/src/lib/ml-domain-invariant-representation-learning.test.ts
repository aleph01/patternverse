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
  resolve(root, 'content/assets/widgets/ml-domain-invariant-representation-learning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-domain-invariant-representation-learning',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Domain-Invariant Representation Learning', () => {
  it('reproduces the documented balanced fixture and all candidate scores', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.data).toHaveLength(16);
      expect(new Set(r.data.map((x: { id: string }) => x.id)).size).toBe(16);
      expect(r.selected.id).toBe(reference.example.default_encoder);
      expect([
        r.selected.sourceError,
        r.selected.targetError,
        r.selected.domainError,
        r.selected.score,
      ]).toEqual([0, 0, 0.5, -0.25]);
      expect(r.fits.map((f: { score: number }) => f.score)).toEqual([0, -0.25, 0.5, 0.25]);
      expect(r.selected.distribution).toEqual([
        { z: [-1], source: 4, target: 4 },
        { z: [1], source: 4, target: 4 },
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('independently verifies all 120 configurations and the finite score minimizer', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const scenario of ['aligned', 'prior', 'reversed'])
        for (const weight of [0, 0.5, 1, 2])
          for (const choice of ['auto', 'raw', 'signal', 'domain', 'constant'])
            for (const probe of ['lookup', 'constant']) {
              const r = get(dom, `compute('${scenario}',${weight},'${choice}','${probe}')`);
              const prior = scenario === 'prior',
                reverse = scenario === 'reversed';
              const source = [0, 0, prior ? 0.25 : 0.5, prior ? 0.25 : 0.5],
                target = [reverse ? 1 : 0, reverse ? 1 : 0, prior ? 0.75 : 0.5, prior ? 0.75 : 0.5],
                tv = [1, prior ? 0.5 : 0, 1, 0],
                de = probe === 'constant' ? [0.5, 0.5, 0.5, 0.5] : [0, prior ? 0.25 : 0.5, 0, 0.5];
              const scores = source.map((v, j) => v - weight * de[j]);
              r.fits.forEach(
                (
                  f: {
                    sourceError: number;
                    targetError: number;
                    tv: number;
                    domainError: number;
                    score: number;
                    distribution: { source: number; target: number; z: number[] }[];
                  },
                  j: number,
                ) => {
                  expect(f.sourceError).toBe(source[j]);
                  expect(f.targetError).toBe(target[j]);
                  expect(f.tv).toBe(tv[j]);
                  expect(f.domainError).toBe(de[j]);
                  expect(f.score).toBe(scores[j]);
                  expect(
                    f.distribution.reduce((n: number, b: { source: number }) => n + b.source, 0),
                  ).toBe(8);
                },
              );
              const index =
                choice === 'auto'
                  ? scores.indexOf(Math.min(...scores))
                  : ['raw', 'signal', 'domain', 'constant'].indexOf(choice);
              expect(r.selected).toEqual(r.fits[index]);
              count++;
            }
      expect(count).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('exposes collapse under label shift, conditional failure, and weak-probe false reassurance', () => {
    const dom = openExample();
    try {
      const collapsed = get(dom, "compute('prior',2,'auto','lookup').selected");
      expect([collapsed.id, collapsed.sourceError, collapsed.targetError, collapsed.score]).toEqual(
        ['constant', 0.25, 0.75, -0.75],
      );
      expect(get(dom, "compute('prior',1,'auto','lookup').selected.id")).toBe('signal');
      const reversed = get(dom, "compute('reversed',.5,'auto','lookup').selected");
      expect([reversed.id, reversed.targetError, reversed.domainError]).toEqual(['signal', 1, 0.5]);
      const weak = get(dom, "compute('aligned',2,'auto','constant').selected");
      expect([weak.id, weak.domainError, weak.tv]).toEqual(['raw', 0.5, 1]);
      for (const scenario of ['aligned', 'prior', 'reversed'])
        for (const f of get(dom, `compute('${scenario}',.5,'auto','lookup').fits`))
          expect(1 - f.domainError).toBe((1 + f.tv) / 2);
    } finally {
      dom.window.close();
    }
  });
  it('never uses target labels for fitting, domain probing, or selection', () => {
    const dom = openExample();
    try {
      const a = get(dom, 'report'),
        b = get(
          dom,
          "compute('aligned',.5,'auto','lookup',records('aligned').map(r=>r.domain==='target'?{...r,y:1-r.y}:r))",
        );
      const withoutOracle = (fits: Record<string, unknown>[]) =>
        fits.map((f) => Object.fromEntries(Object.entries(f).filter(([k]) => k !== 'targetError')));
      expect(withoutOracle(a.fits)).toEqual(withoutOracle(b.fits));
      expect(a.selected.id).toBe(b.selected.id);
      expect(b.selected.targetError).toBe(1);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
    } finally {
      dom.window.close();
    }
  });
  it('updates all controls, tables, resets, and phone diagram', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      change('#scenario', 'prior');
      change('#weight', '2');
      expect(d.querySelector('output')!.textContent).toContain('Target check 25%');
      change('#encoder', 'signal');
      expect(d.querySelector('output')!.textContent).toContain('Target check 100%');
      change('#probe', 'constant');
      expect(get(dom, 'report.selected.domainError')).toBe(0.5);
      expect(d.querySelectorAll('#fits-data tr')).toHaveLength(4);
      expect(d.querySelectorAll('#data-values tr')).toHaveLength(4);
      (d.querySelector('#data') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(get(dom, '[report.scenario,report.weight,report.choice,report.probe]')).toEqual([
        'aligned',
        0.5,
        'auto',
        'lookup',
      ]);
      expect((d.querySelector('#data') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 760');
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
      (e) => e.id === 'ml-domain-invariant-representation-learning',
    )!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-monitoring-and-robustness',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain(
      '/assets/machine-learning/domain-invariant-representation-learning.svg',
    );
    expect(rendered).toContain(
      '/assets/machine-learning/domain-invariant-representation-learning-mobile.svg',
    );
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-domain-invariant-representation-learning.md'),
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

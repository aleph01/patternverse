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
  resolve(root, 'content/assets/widgets/ml-model-versioning.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-model-versioning');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Model Versioning manifest assembly', () => {
  it('reproduces the complete, partial, and three-request fixtures', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'manifests')).toEqual(reference.example.manifests);
      expect(read(dom, 'report')).toMatchObject({
        release: 'R1',
        scope: 'weights',
        distance: 30,
        matches: false,
        delta: -5,
        expected: { minutes: 30, review: true },
        actual: { minutes: 25, review: false },
      });
      expect(read(dom, "restore('R1','transform',30)")).toMatchObject({
        matches: false,
        delta: 0,
        actual: { minutes: 30, review: false },
      });
      expect(read(dom, "restore('R1','complete',30)")).toMatchObject({
        matches: true,
        delta: 0,
        actual: { minutes: 30, review: true },
      });
      expect(read(dom, '[10,20,30].map(d=>execute(manifests.R1,d).minutes)')).toEqual(
        reference.example.three_request_minutes,
      );
      for (const [policy, count] of Object.entries(reference.example.three_request_reviews)) {
        expect(
          read(
            dom,
            `[10,20,30].filter(d=>execute({...manifests.R1,policy:'${policy}'},d).review).length`,
          ),
        ).toBe(count);
      }
    } finally {
      dom.window.close();
    }
  });
  it('checks all twenty-four offered configurations against independent arithmetic', () => {
    const dom = openExample();
    try {
      const before = dom.window.eval('JSON.stringify({manifests,transforms,weights,policies})');
      for (const release of ['R1', 'R2'])
        for (const scope of reference.example.scopes)
          for (const distance of reference.example.distances_km) {
            const r = read(dom, `restore('${release}','${scope}',${distance})`);
            const usesOldWeights = release === 'R1';
            const usesOldTransform = usesOldWeights && scope !== 'weights';
            const usesOldPolicy = usesOldWeights && scope === 'complete';
            const z = (distance - (usesOldTransform ? 10 : 20)) / 10;
            const minutes = (usesOldWeights ? 20 : 24) + (usesOldWeights ? 5 : 4) * z;
            const expected = release === 'R1' ? 15 + distance / 2 : 16 + distance * 0.4;
            expect(r.actual.z).toBe(z);
            expect(r.actual.minutes).toBe(minutes);
            expect(r.actual.review).toBe(minutes >= (usesOldPolicy ? 30 : 32));
            expect(r.expected.minutes).toBe(expected);
            expect(r.delta).toBe(minutes - expected);
            expect(r.matches).toBe(release === 'R2' || scope === 'complete');
            expect(r.requested).toEqual(reference.example.manifests[release]);
          }
      expect(dom.window.eval('JSON.stringify({manifests,transforms,weights,policies})')).toBe(
        before,
      );
    } finally {
      dom.window.close();
    }
  });
  it('separates identity from output agreement and uses inclusive review thresholds', () => {
    const dom = openExample();
    try {
      const coincident = read(dom, "restore('R1','transform',10)");
      expect(coincident).toMatchObject({
        matches: false,
        delta: 0,
        actual: { minutes: 20, review: false },
        expected: { minutes: 20, review: false },
      });
      expect(read(dom, 'execute(manifests.R1,30)')).toMatchObject({ minutes: 30, review: true });
      expect(read(dom, 'execute(manifests.R1,29.999).review')).toBe(false);
      expect(read(dom, 'execute(manifests.R2,40)')).toMatchObject({ minutes: 32, review: true });
      expect(read(dom, 'execute(manifests.R2,39.999).review')).toBe(false);
    } finally {
      dom.window.close();
    }
  });
  it('resolves movable aliases without rewriting prior identity and rejects missing inputs', () => {
    const dom = openExample();
    try {
      dom.window.eval(
        "var aliases={champion:'R1'};var earlier=resolveRelease('champion',aliases);aliases.champion='R2'",
      );
      expect(read(dom, 'earlier')).toEqual({ id: 'R1', manifest: reference.example.manifests.R1 });
      expect(read(dom, "resolveRelease('champion',aliases).id")).toBe('R2');
      expect(read(dom, "resolveRelease('R1',aliases).id")).toBe('R1');
      dom.window.eval("earlier.manifest.transform='T2'");
      expect(read(dom, 'manifests.R1')).toEqual(reference.example.manifests.R1);
      for (const expr of [
        "resolveRelease('missing',{})",
        "restore('R9','complete',30)",
        "restore('R1','unknown',30)",
        "execute({...manifests.R1,weights:'deleted'},30)",
        'execute(manifests.R1,NaN)',
        'execute(manifests.R1,-1)',
        'execute(manifests.R1,Infinity)',
      ])
        expect(() => dom.window.eval(expr)).toThrow();
      expect(read(dom, 'Object.isFrozen(manifests.R1)&&Object.isFrozen(transforms.T1)')).toBe(true);
    } finally {
      dom.window.close();
    }
  });
  it('updates controls and explanatory states and resets input and optional detail', () => {
    const dom = openExample();
    try {
      const d = dom.window.document;
      const change = (id: string, v: string) => {
        const s = d.querySelector(id) as HTMLSelectElement;
        s.value = v;
        s.dispatchEvent(new dom.window.Event('change'));
      };
      change('#scope', 'transform');
      expect(d.querySelector('#interpretation')!.textContent).toContain('estimate matches, but');
      change('#distance', '10');
      expect(d.querySelector('#interpretation')!.textContent).toContain(
        'component IDs still differ',
      );
      change('#scope', 'complete');
      expect(d.querySelector('output')!.textContent).toContain('All component IDs match');
      change('#release', 'R2');
      expect(read(dom, 'report.matches')).toBe(true);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 800');
      for (const detail of d.querySelectorAll('details'))
        (detail as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        release: 'R1',
        scope: 'weights',
        distance: 30,
        delta: -5,
      });
      expect(d.querySelectorAll('#components tbody tr')).toHaveLength(3);
      for (const detail of d.querySelectorAll('details'))
        expect((detail as HTMLDetailsElement).open).toBe(false);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-model-versioning')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/model-versioning.svg');
    expect(rendered).toContain('/assets/machine-learning/model-versioning-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-model-versioning.md'), 'utf8');
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
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/model-versioning' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('30 min · Review');
    }
  });
});

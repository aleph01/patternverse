// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-feature-store.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-feature-store');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Feature Store shared aggregation and consumer policy', () => {
  it('reproduces historical, online, fresh, variant and paused examples', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'sourceEvents')).toEqual(reference.example.events);
      expect(read(dom, 'report')).toMatchObject({
        now: 605,
        refresh: '15',
        version: 'v1',
        history: { value: 7, cutoff: 580 },
        snapshot: { value: 12, at: 600 },
        fresh: { value: 20 },
        difference: 8,
        guard: { age: 5, accepted: true, feature: 12 },
      });
      expect(read(dom, "buildReport(605,'15','v2')")).toMatchObject({
        history: { value: 3 },
        snapshot: { value: 8 },
        fresh: { value: 13 },
        guard: { accepted: false, issues: ['definition'], feature: null },
      });
      expect(read(dom, "buildReport(605,'paused','v1')")).toMatchObject({
        snapshot: { at: 585, value: 7 },
        guard: { age: 20, accepted: false, issues: ['stale'], feature: null },
      });
      expect(read(dom, "aggregate('B','v1',580).value")).toBe(reference.example.missing_B);
      expect(read(dom, "aggregate('C','v1',580).value")).toBe(reference.example.observed_empty_C);
    } finally {
      dom.window.close();
    }
  });
  it('checks all twenty-four configurations against independent source-row arithmetic', () => {
    const dom = openExample();
    try {
      const before = dom.window.eval('JSON.stringify({sourceEvents,definitions,coverage})');
      for (const now of reference.example.serving_minutes)
        for (const refresh of reference.example.refresh_choices)
          for (const version of ['v1', 'v2']) {
            const r = read(dom, `buildReport(${now},'${refresh}','${version}')`),
              window = reference.example.windows_minutes[version];
            const at = refresh === 'paused' ? 585 : now - (now % Number(refresh));
            const count = (time: number) =>
              reference.example.events.reduce(
                (sum: number, e: { event: number; ready: number; orders: number }) =>
                  sum +
                  (e.event > time - window && e.event <= time && e.ready <= time ? e.orders : 0),
                0,
              );
            expect(r.history.value).toBe(count(580));
            expect(r.snapshot.value).toBe(count(at));
            expect(r.snapshot.at).toBe(at);
            expect(r.fresh.value).toBe(count(now));
            expect(r.difference).toBe(count(now) - count(at));
            expect(r.guard.age).toBe(now - at);
            expect(r.guard.accepted).toBe(version === 'v1' && now - at <= 10);
            expect(r.guard.feature).toBe(r.guard.accepted ? count(at) : null);
          }
      expect(dom.window.eval('JSON.stringify({sourceEvents,definitions,coverage})')).toBe(before);
    } finally {
      dom.window.close();
    }
  });
  it('enforces boundary, availability, entity and coverage semantics before aggregating', () => {
    const dom = openExample();
    try {
      expect(read(dom, "aggregate('A','v1',610).ids")).toEqual(['O2', 'O3', 'O4']);
      expect(read(dom, "aggregate('A','v2',605).ids")).toEqual(['O3', 'O4']);
      expect(read(dom, "aggregate('A','v1',550).value")).toBe(0);
      expect(read(dom, "aggregate('A','v1',551).value")).toBe(4);
      expect(read(dom, "aggregate('A','v1',603).value")).toBe(12);
      expect(read(dom, "aggregate('A','v1',604).value")).toBe(20);
      expect(read(dom, "aggregate('A','v1',500).value")).toBeNull();
      expect(read(dom, "materialize('B','v1',600)")).toBeNull();
      expect(read(dom, "guardSnapshot(materialize('C','v1',600),605)")).toMatchObject({
        accepted: true,
        feature: 0,
      });
      expect(read(dom, 'guardSnapshot(null,605)')).toMatchObject({
        accepted: false,
        feature: null,
        issues: ['missing'],
      });
      expect(
        read(
          dom,
          "aggregate('A','v1',600,[...sourceEvents,{id:'other',entity:'B',event:590,ready:591,orders:1000}]).value",
        ),
      ).toBe(12);
      expect(
        read(
          dom,
          "aggregate('A','v1',600,[...sourceEvents,{id:'late',entity:'A',event:590,ready:610,orders:1000}]).value",
        ),
      ).toBe(12);
      expect(read(dom, "aggregate('A','v1',600,[...sourceEvents].reverse()).value")).toBe(12);
    } finally {
      dom.window.close();
    }
  });
  it('checks inclusive age limits, future snapshots and invalid inputs without supplying fallbacks', () => {
    const dom = openExample();
    try {
      expect(read(dom, "guardSnapshot(materialize('A','v1',600),610)")).toMatchObject({
        accepted: true,
        age: 10,
        feature: 12,
      });
      expect(read(dom, "guardSnapshot(materialize('A','v1',600),611)")).toMatchObject({
        accepted: false,
        age: 11,
        feature: null,
        issues: ['stale'],
      });
      expect(read(dom, "guardSnapshot(materialize('A','v1',605),600)")).toMatchObject({
        accepted: false,
        feature: null,
        issues: ['future'],
      });
      expect(read(dom, "guardSnapshot(materialize('A','v2',585),605)")).toMatchObject({
        accepted: false,
        feature: null,
        issues: ['definition', 'stale'],
      });
      const invalid = [
        'buildReport(601)',
        "buildReport(605,'unknown')",
        "buildReport(605,'15','v3')",
        "aggregate('A','v1',NaN)",
        "aggregate('A','v1',-1)",
        "aggregate('A','v1',600,[...sourceEvents,sourceEvents[0]])",
        "aggregate('A','v1',600,[{...sourceEvents[0],orders:-1}])",
        "aggregate('A','v1',600,[{...sourceEvents[0],ready:1}])",
        "guardSnapshot(null,605,'v1',-1)",
      ];
      for (const expr of invalid) expect(() => dom.window.eval(expr)).toThrow();
      expect(
        read(dom, 'Object.isFrozen(definitions.v1)&&sourceEvents.every(Object.isFrozen)'),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });
  it('changes publication and definition controls and resets inputs and optional detail', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const el = d.querySelector(id) as HTMLSelectElement;
          el.value = value;
          el.dispatchEvent(new dom.window.Event('change'));
        };
      change('#refresh', '5');
      expect(read(dom, 'report.snapshot.value')).toBe(20);
      expect(read(dom, 'report.guard.age')).toBe(0);
      change('#now', '610');
      expect(read(dom, 'report.snapshot.value')).toBe(16);
      change('#refresh', 'paused');
      expect(d.querySelector('output')!.textContent).toContain('Stale; defer M1');
      change('#version', 'v2');
      expect(d.querySelector('#interpretation')!.textContent).toContain('also stale');
      expect(d.querySelector('#checks')!.textContent).toContain('not supplied');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 740');
      for (const el of d.querySelectorAll('details')) (el as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        now: 605,
        refresh: '15',
        version: 'v1',
        snapshot: { value: 12 },
        guard: { accepted: true },
      });
      expect(d.querySelectorAll('#events tbody tr')).toHaveLength(4);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-feature-store')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/feature-store.svg');
    expect(rendered).toContain('/assets/machine-learning/feature-store-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-feature-store.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/feature-store' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('4 + 3 + 5 = 12');
    }
  });
});

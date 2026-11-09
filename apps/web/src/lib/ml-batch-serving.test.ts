// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-batch-serving.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-batch-serving');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Batch Serving predictions, publication and consumer guards', () => {
  it('computes keyed predictions and the default cutoff/publication age arithmetic', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'snapshots')).toEqual(reference.example.snapshots);
      expect(read(dom, 'expected')).toEqual(reference.example.expected_keys);
      const r = read(dom, 'report');
      expect(r.active.id).toBe('R8');
      expect(r.lookup).toMatchObject({
        status: 'usable',
        value: 9,
        stored: 9,
        age: 30,
        publicationAge: 10,
      });
      expect(r.candidate.results.map((v: { prediction: number }) => v.prediction)).toEqual([
        9, 15, 1, 5,
      ]);
      expect(r.prior.results.map((v: { prediction: number }) => v.prediction)).toEqual([
        7, 13, 1, 3,
      ]);
      expect(read(dom, "buildReport(490,'complete','A').lookup")).toMatchObject({
        value: 7,
        age: 70,
        publicationAge: 50,
      });
      expect(read(dom, "buildReport(510,'missing-B','A').lookup")).toMatchObject({
        value: 7,
        age: 90,
        publicationAge: 70,
      });
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all thirty scenarios, eligibility and inclusive age boundaries', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const at of [490, 500, 510, 600, 601])
        for (const outcome of ['complete', 'missing-B'])
          for (const entity of ['A', 'C', 'E']) {
            count++;
            const current = at >= 500 && outcome === 'complete',
              cutoff = current ? 480 : 420,
              published = current ? 500 : 440,
              age = at - cutoff;
            const stored = entity === 'E' ? null : entity === 'C' ? 1 : current ? 9 : 7,
              status = stored === null ? 'missing' : age <= 120 ? 'usable' : 'stale';
            const r = read(dom, `buildReport(${at},'${outcome}','${entity}')`);
            expect(r.active.id).toBe(current ? 'R8' : 'R7');
            expect(r.activated).toBe(current);
            expect(r.lookup).toMatchObject({
              status,
              stored,
              value: status === 'usable' ? stored : null,
              age,
              publicationAge: at - published,
            });
            expect(r.candidate.check.fraction).toBe(outcome === 'complete' ? 1 : 0.75);
            expect(r.state).toBe(at < 500 ? 'processing' : current ? 'published' : 'blocked');
            expect(r.active.model).toBe('M1');
            expect(r.active.transform).toBe('T1');
            expect([r.active.targetStart, r.active.targetEnd]).toEqual([720, 1080]);
          }
      expect(count).toBe(30);
      expect(read(dom, 'buildReport(500).lookup.publicationAge')).toBe(0);
      expect(read(dom, 'buildReport(600).lookup.status')).toBe('usable');
      expect(read(dom, 'buildReport(601).lookup.status')).toBe('stale');
      expect(read(dom, "buildReport(601,'complete','E').lookup.status")).toBe('missing');
    } finally {
      dom.window.close();
    }
  });
  it('checks exact keys, missing versus zero, immutable inputs and invalid run contracts', () => {
    const dom = openExample();
    try {
      const duplicate = read(
        dom,
        "coverage([{key:'A',prediction:9},{key:'A',prediction:9},{key:'C',prediction:1},{key:'D',prediction:5}],expected)",
      );
      expect(duplicate).toMatchObject({
        complete: false,
        present: 3,
        total: 4,
        duplicates: ['A'],
        missing: ['B'],
      });
      const unexpected = read(
        dom,
        "coverage([{key:'A',prediction:9},{key:'E',prediction:9},{key:'C',prediction:1},{key:'D',prediction:5}],expected)",
      );
      expect(unexpected).toMatchObject({ complete: false, unexpected: ['E'], missing: ['B'] });
      expect(read(dom, "buildReport(510,'complete','C').lookup")).toMatchObject({
        status: 'usable',
        orders: 0,
        value: 1,
      });
      expect(read(dom, "buildReport(510,'complete','E').lookup")).toMatchObject({
        status: 'missing',
        orders: null,
        value: null,
      });
      expect(
        read(
          dom,
          'Object.isFrozen(model)&&Object.isFrozen(expected)&&Object.isFrozen(snapshots.R8)&&snapshots.R8.every(Object.isFrozen)',
        ),
      ).toBe(true);
      expect(read(dom, 'snapshots')).toEqual(reference.example.snapshots);
      expect(read(dom, "scoreRows([['Z',5]])[0].prediction")).toBe(11);
      for (const expression of [
        'scoreRows([])',
        "scoreRows([['A',1],['A',2]])",
        "scoreRows([['A',-1]])",
        "scoreRows([['A',1.5]])",
        "scoreRows([['A',Infinity]])",
        "scoreRows([['A',Number.MAX_SAFE_INTEGER]])",
        "coverage([],['A','A'])",
        "coverage([{key:'A',prediction:NaN}],expected)",
        "createRun('R9',480,500,[])",
        "createRun('R8',500,480,[])",
        "lookup(report.active,'A',499)",
        "lookup(report.active,'A',510,-1)",
        "lookup(createRun('R8',480,500,[]),'A',510)",
        'buildReport(499)',
        "buildReport(510,'partial')",
        "buildReport(510,'complete','Z')",
      ])
        expect(() => dom.window.eval(expression)).toThrow();
      // A consumer lookup reads the already prepared set; it does not call the scoring function.
      dom.window.eval("scoreRows = () => { throw Error('Unexpected scoring during lookup'); }");
      expect(read(dom, "lookup(report.active,'A',510).value")).toBe(9);
    } finally {
      dom.window.close();
    }
  });
  it('independently counts retry work without treating duplicated work as unique outputs', () => {
    const f = reference.example.retry_work;
    expect(f.partitions * f.partition_records).toBe(f.expected_records);
    expect(f.expected_records + f.repeated_partitions * f.partition_records).toBe(1250);
    expect(f.evaluations).toBe(1250);
    expect(f.unique_results).toBe(1000);
    expect(f.evaluations).toBeGreaterThan(f.unique_results);
  });
  it('changes all controls, distinguishes stale and missing, sizes for phone and resets', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const el = d.querySelector(id) as HTMLSelectElement;
          el.value = value;
          el.dispatchEvent(new dom.window.Event('change'));
        };
      change('#time', '490');
      expect(d.querySelector('output')!.textContent).toContain('7 items from R7');
      change('#time', '500');
      expect(d.querySelector('output')!.textContent).toContain('9 items from R8');
      change('#outcome', 'missing-B');
      expect(d.querySelector('#coverage')!.textContent).toContain('3 / 4 = 75%');
      change('#entity', 'C');
      expect(d.querySelector('#formula')!.textContent).toContain('2 × 0 orders + 1 = 1 item');
      change('#time', '601');
      expect(d.querySelector('output')!.textContent).toContain('stale');
      change('#entity', 'E');
      expect(d.querySelector('output')!.textContent).toContain('has no prediction');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 830');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({ at: 510, outcome: 'complete', entity: 'A' });
      expect(d.querySelector('output')!.textContent).toContain('9 items from R8');
      for (const e of d.querySelectorAll('details'))
        expect((e as HTMLDetailsElement).open).toBe(false);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-batch-serving')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/batch-serving.svg');
    expect(rendered).toContain('/assets/machine-learning/batch-serving-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-batch-serving.md'), 'utf8');
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
    expect(reference.visual.interactive_asset).toBe('ml-batch-serving.html');
    expect(reference.collections).toContain('machine-learning-training-and-deployment');
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(root, 'content/assets/machine-learning/batch-serving' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Consumer reads R8');
    }
  });
});

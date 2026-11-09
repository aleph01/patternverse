// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-checkpoints.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-checkpoints');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Checkpoints training-state restoration', () => {
  it('reproduces saved state and each isolated next-update fixture', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'targets')).toEqual(reference.example.targets);
      expect(read(dom, 'config.rate')).toBe(0.1);
      expect(read(dom, 'config.momentum')).toBe(0.5);
      const r = read(dom, 'report'),
        f = reference.example.default;
      for (const key of ['w', 'v', 'step', 'cursor']) {
        expect(r.saved[key]).toBeCloseTo(f.saved[key], 12);
        expect(r.used[key]).toBeCloseTo(f.used[key], 12);
      }
      expect(r.referenceFinal.w).toBeCloseTo(f.reference_weight, 12);
      expect(r.continued.state.w).toBeCloseTo(f.restored_weight, 12);
      expect(r.difference).toBeCloseTo(f.difference, 12);
      expect(r.matches).toBe(false);
      const expected = [
        [1, 0.1, -1],
        [3, 0.44, -3.4],
        [1, 0.666, -2.26],
      ];
      r.original.forEach((step: { target: number; w: number; v: number }, i: number) => {
        expect(step.target).toBe(expected[i][0]);
        expect(step.w).toBeCloseTo(expected[i][1], 12);
        expect(step.v).toBeCloseTo(expected[i][2], 12);
      });
      for (const [scope, value] of Object.entries(reference.example.isolation_after_three))
        expect(read(dom, `buildReport(3,'${scope}',1).continued.state.w`)).toBeCloseTo(
          value as number,
          12,
        );
    } finally {
      dom.window.close();
    }
  });
  it('checks all sixteen configurations against independent affine state transitions', () => {
    const dom = openExample();
    try {
      const oracle = (s: { w: number; v: number; step: number; cursor: number }, n: number) => {
        const out = [];
        for (let i = 0; i < n; i++) {
          const y = [1, 3][s.cursor];
          s = {
            w: 0.9 * s.w - 0.05 * s.v + 0.1 * y,
            v: s.w + 0.5 * s.v - y,
            step: s.step + 1,
            cursor: 1 - s.cursor,
          };
          out.push({ ...s, target: y });
        }
        return out;
      };
      let count = 0;
      for (const cp of reference.example.checkpoint_choices)
        for (const scope of reference.example.scope_choices)
          for (const n of reference.example.updates_choices) {
            count++;
            const original = oracle({ w: 0, v: 0, step: 0, cursor: 0 }, cp + n),
              saved = { ...original[cp - 1] },
              used = { ...saved };
            if (scope === 'weights') {
              used.v = 0;
              used.step = 0;
              used.cursor = 0;
            }
            if (scope === 'data') used.v = 0;
            if (scope === 'optimizer') used.cursor = 0;
            const expected = oracle(used, n),
              r = read(dom, `buildReport(${cp},'${scope}',${n})`);
            for (let i = 0; i < n; i++)
              for (const key of ['w', 'v', 'step', 'cursor'] as const) {
                expect(r.continued.trace[i][key]).toBeCloseTo(expected[i][key], 12);
                expect(r.reference[i][key]).toBeCloseTo(original[cp + i][key], 12);
              }
            expect(r.continued.trace.map((v: { target: number }) => v.target)).toEqual(
              expected.map((v) => v.target),
            );
            expect(r.difference).toBeCloseTo(expected[n - 1].w - original[cp + n - 1].w, 12);
            expect(r.complete).toBe(scope === 'full');
            expect(r.matches).toBe(scope === 'full' || (scope === 'optimizer' && cp === 2));
            expect(read(dom, `loadCheckpoint(${JSON.stringify(r.serialized)}).state.step`)).toBe(
              cp,
            );
          }
      expect(count).toBe(16);
    } finally {
      dom.window.close();
    }
  });
  it('isolates serialized snapshots, validates recovery identities and distinguishes coincident from complete restores', () => {
    const dom = openExample();
    try {
      const snap = dom.window.eval(
        'const savedForTest=train(initial(),3).state;const snapshotForTest=saveCheckpoint(savedForTest);savedForTest.w=99;snapshotForTest',
      );
      const loaded = read(dom, `loadCheckpoint(${JSON.stringify(snap)})`);
      expect(loaded.state.w).toBeCloseTo(0.666, 12);
      dom.window.eval(
        `const loadedForTest=loadCheckpoint(${JSON.stringify(snap)});loadedForTest.state.v=123;`,
      );
      expect(read(dom, `loadCheckpoint(${JSON.stringify(snap)}).state.v`)).toBeCloseTo(-2.26, 12);
      expect(read(dom, "buildReport(2,'optimizer',3)")).toMatchObject({
        matches: true,
        complete: false,
      });
      expect(read(dom, "buildReport(3,'optimizer',3).matches")).toBe(false);
      for (const [key, value] of [
        ['complete', false],
        ['format', 2],
        ['run', 'other-run'],
        ['data', 'different-order'],
        ['rate', 0.2],
        ['momentum', 0.9],
        ['rule', 'other-rule'],
      ]) {
        const p = { ...loaded, [key as string]: value };
        expect(() =>
          dom.window.eval(`loadCheckpoint(${JSON.stringify(JSON.stringify(p))})`),
        ).toThrow();
      }
      expect(read(dom, 'Object.isFrozen(config)&&Object.isFrozen(targets)')).toBe(true);
      for (const expr of [
        'loadCheckpoint("not json")',
        'loadCheckpoint(null)',
        'train(initial(),-1)',
        'train(initial(),13)',
        'train(initial(),1.5)',
        "restore(report.serialized,'unknown')",
        'buildReport(4)',
        "buildReport(3,'unknown')",
        "buildReport(3,'full',2)",
        'update({w:NaN,v:0,step:0,cursor:0})',
        'update({w:1,v:0,step:-1,cursor:0})',
        'update({w:1,v:0,step:0,cursor:2})',
        'update({w:Number.MAX_VALUE,v:Number.MAX_VALUE,step:0,cursor:0})',
        'saveCheckpoint({w:0,v:0,step:3,cursor:0})',
      ])
        expect(() => dom.window.eval(expr)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('independently verifies the save-cadence arithmetic and latest-versus-best selection examples', () => {
    const f = reference.example.cadence;
    for (const scenario of [f.ten_minute, f.five_minute]) {
      const writes = Math.floor(f.training_minutes / scenario.interval),
        latest = writes * scenario.interval;
      expect(writes).toBe(scenario.writes);
      expect(latest).toBe(scenario.last_saved_training_minute);
      expect(f.training_minutes - latest).toBe(scenario.repeated_training_minutes);
      expect(f.training_minutes + writes * f.write_minutes).toBe(scenario.elapsed_minutes);
    }
    const s = reference.example.validation_selection;
    expect(s.updates[s.losses.indexOf(Math.min(...s.losses))]).toBe(s.best_update);
    expect(Math.max(...s.updates)).toBe(s.latest_update);
    expect(s.best_update).not.toBe(s.latest_update);
  });
  it('updates each restore control, exposes coincident continuation and resets values and details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const e = d.querySelector(id) as HTMLSelectElement;
          e.value = value;
          e.dispatchEvent(new dom.window.Event('change'));
        };
      change('#scope', 'full');
      expect(d.querySelector('output')!.textContent).toContain('w 1.0124; uninterrupted w 1.0124');
      expect(d.querySelector('#match')!.textContent).toContain('Complete restoration');
      change('#scope', 'data');
      expect(read(dom, 'report.continued.state.w')).toBeCloseTo(0.8994, 12);
      change('#scope', 'optimizer');
      expect(read(dom, 'report.continued.state.w')).toBeCloseTo(0.8124, 12);
      expect(d.querySelector('#targets')!.textContent).toContain('Chosen next targets: 1');
      change('#checkpoint', '2');
      change('#updates', '3');
      expect(d.querySelector('#match')!.textContent).toContain('happened to be correct');
      expect(d.querySelectorAll('#trace tbody tr')).toHaveLength(3);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 750');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        checkpoint: 3,
        scope: 'weights',
        updates: 1,
        matches: false,
      });
      expect(d.querySelectorAll('#components tbody tr')).toHaveLength(4);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-checkpoints')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/checkpoints.svg');
    expect(rendered).toContain('/assets/machine-learning/checkpoints-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-checkpoints.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/checkpoints' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('w 0.6994');
    }
  });
});

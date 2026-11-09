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
  resolve(root, 'content/assets/widgets/ml-workflow-pipeline.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-workflow-pipeline');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Workflow Pipeline dependency scheduling', () => {
  it('reproduces elapsed time, work and the declared task graph', () => {
    const dom = openExample();
    try {
      const r = read(dom, 'report');
      expect(r).toMatchObject(reference.example.default);
      for (const s of r.nodes) {
        expect(s.duration).toBe(reference.example.durations_minutes[s.id]);
        expect(s.deps).toEqual(reference.example.dependencies[s.id]);
        expect([s.start, s.end]).toEqual(reference.example.default_times[s.id]);
        expect(s.produced).not.toBeNull();
      }
      expect(read(dom, "runPipeline(1,'success','pass')")).toMatchObject(reference.example.serial);
      expect(read(dom, "runPipeline(2,'retry','pass')")).toMatchObject(
        reference.example.retry_parallel,
      );
      expect(read(dom, "runPipeline(2,'fail','pass')")).toMatchObject(
        reference.example.training_failure,
      );
      expect(read(dom, "runPipeline(2,'success','reject')")).toMatchObject(
        reference.example.rejection_parallel,
      );
    } finally {
      dom.window.close();
    }
  });
  it('checks all twelve configurations against an independent timing oracle and resource invariants', () => {
    const dom = openExample();
    try {
      const before = dom.window.eval('JSON.stringify(steps)');
      for (const slots of reference.example.slot_choices)
        for (const training of reference.example.training_choices)
          for (const quality of reference.example.quality_choices) {
            const r = read(dom, `runPipeline(${slots},'${training}','${quality}')`);
            const failed = training === 'fail',
              extra = training === 'success' ? 0 : 8;
            const elapsed = failed
              ? 21
              : 13 + extra + (slots === 1 ? 6 : 4) + (quality === 'pass' ? 1 : 0);
            const work = failed ? 21 : 19 + extra + (quality === 'pass' ? 1 : 0);
            expect(r).toMatchObject({ elapsed, work, released: !failed && quality === 'pass' });
            const attempts = r.nodes.flatMap((s: { id: string; attempts: object[] }) =>
              s.attempts.map((a) => ({ ...a, id: s.id })),
            );
            for (const s of r.nodes) {
              if (s.status === 'blocked') {
                expect(s.attempts).toHaveLength(0);
                expect(s.produced).toBeNull();
              }
              if (s.status === 'failed') expect(s.produced).toBeNull();
              for (const a of s.attempts) {
                expect(a.end - a.start).toBe(s.duration);
                for (const id of s.deps) {
                  const dep = r.nodes.find((d: { id: string }) => d.id === id);
                  expect(dep.status).toBe('complete');
                  expect(a.start).toBeGreaterThanOrEqual(dep.end);
                }
              }
            }
            for (let time = 0.5; time < r.elapsed; time += 1)
              expect(
                attempts.filter(
                  (a: { start: number; end: number }) => a.start <= time && a.end > time,
                ).length,
              ).toBeLessThanOrEqual(slots);
            expect(
              attempts.reduce(
                (sum: number, a: { start: number; end: number }) => sum + a.end - a.start,
                0,
              ),
            ).toBe(work);
          }
      expect(dom.window.eval('JSON.stringify(steps)')).toBe(before);
    } finally {
      dom.window.close();
    }
  });
  it('distinguishes exhausted retries, retained upstream outputs and successful rejection reports', () => {
    const dom = openExample();
    try {
      const retry = read(dom, "runPipeline(2,'retry','pass')");
      expect(retry.nodes.find((s: { id: string }) => s.id === 'train').attempts).toEqual([
        { attempt: 1, start: 5, end: 13, result: 'Failed' },
        { attempt: 2, start: 13, end: 21, result: 'Complete' },
      ]);
      expect(retry.nodes.slice(0, 2).map((s: { attempts: object[] }) => s.attempts.length)).toEqual(
        [1, 1],
      );
      const failed = read(dom, "runPipeline(2,'fail','pass')");
      expect(
        failed.nodes
          .slice(3)
          .every(
            (s: { status: string; produced: null }) =>
              s.status === 'blocked' && s.produced === null,
          ),
      ).toBe(true);
      expect(read(dom, "runPipeline(2,'fail','reject').nodes")).toEqual(failed.nodes);
      const rejected = read(dom, "runPipeline(2,'success','reject')");
      expect(rejected.nodes.find((s: { id: string }) => s.id === 'evaluate')).toMatchObject({
        status: 'complete',
        produced: 'report Q1 · reject',
        attempts: [{ result: 'Complete' }],
      });
      expect(rejected.nodes.find((s: { id: string }) => s.id === 'release')).toMatchObject({
        status: 'blocked',
        reason: 'Evaluation gate rejected',
        attempts: [],
        produced: null,
      });
    } finally {
      dom.window.close();
    }
  });
  it('recomputes a changed dependency bottleneck and rejects malformed graphs and controls', () => {
    const dom = openExample();
    try {
      expect(
        read(
          dom,
          "runPipeline(2,'success','pass',steps.map(s=>({...s,duration:s.id==='package'?9:s.duration})))",
        ),
      ).toMatchObject({ elapsed: 23, work: 27 });
      expect(
        read(
          dom,
          "runPipeline(1,'success','pass',steps.map(s=>({...s,duration:s.id==='package'?9:s.duration})))",
        ),
      ).toMatchObject({ elapsed: 27, work: 27 });
      const invalid = [
        'runPipeline(0)',
        'runPipeline(3)',
        "runPipeline(2,'forever')",
        "runPipeline(2,'success','unknown')",
        'validateGraph([])',
        'validateGraph([...steps,steps[0]])',
        'validateGraph(steps.map(s=>({...s,duration:0})))',
        'validateGraph(steps.map(s=>({...s,duration:NaN})))',
        'validateGraph(steps.map(s=>({...s,duration:-1})))',
        "validateGraph(steps.map(s=>({...s,deps:['missing']})))",
        "validateGraph(steps.map(s=>s.id==='validate'?{...s,deps:['release']}:s))",
      ];
      for (const expr of invalid) expect(() => dom.window.eval(expr)).toThrow();
      expect(read(dom, 'steps.every(s=>Object.isFrozen(s)&&Object.isFrozen(s.deps))')).toBe(true);
    } finally {
      dom.window.close();
    }
  });
  it('updates computed run state and restores controls and optional details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, v: string) => {
          const el = d.querySelector(id) as HTMLSelectElement;
          el.value = v;
          el.dispatchEvent(new dom.window.Event('change'));
        };
      change('#slots', '1');
      expect(read(dom, 'report.elapsed')).toBe(20);
      change('#training', 'retry');
      expect(read(dom, 'report.elapsed')).toBe(28);
      change('#training', 'fail');
      expect(d.querySelector('#interpretation')!.textContent).toContain(
        'Both training attempts failed',
      );
      expect(d.querySelector('#artifacts')!.textContent).not.toContain('candidate M1');
      change('#training', 'success');
      change('#quality', 'reject');
      expect(read(dom, 'report.elapsed')).toBe(19);
      expect(d.querySelector('#interpretation')!.textContent).toContain('rejected the candidate');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 780');
      for (const el of d.querySelectorAll('details')) (el as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject(reference.example.default);
      expect(d.querySelectorAll('#attempts tbody tr')).toHaveLength(6);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-workflow-pipeline')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/workflow-pipeline.svg');
    expect(rendered).toContain('/assets/machine-learning/workflow-pipeline-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-workflow-pipeline.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/workflow-pipeline' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('17–18 min');
    }
  });
});

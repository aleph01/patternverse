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
  resolve(root, 'content/assets/widgets/ml-shadow-deployment.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-shadow-deployment');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));
const service = [30, 40, 25, 35, 45, 50, 55, 60, 90, 120, 180, 240];
const incumbent = [0, 1, 0, 0, 0, 1, 1, 1, 1, 0, 0, 0],
  candidate = [0, 1, 1, 1, 0, 1, 0, 0, 1, 1, 0, 1],
  truth = [0, 1, 0, 1, 0, 1, 0, 0, 1, 1, 1, 0];
const selection: Record<string, number[]> = {
  all: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  odd: [1, 3, 5, 7, 9, 11],
  quarter: [1, 5, 9],
  off: [],
};
// Independent millisecond event replay: arrivals enqueue, completions free workers, idle workers drain FIFO.
function oracle(mirror: string, workers: number) {
  const pending: number[] = [],
    active: ({ id: number; finish: number } | null)[] = Array(workers).fill(null),
    out = new Map<number, { start: number; finish: number }>();
  for (let tick = 0; tick <= 1200; tick++) {
    for (let worker = 0; worker < workers; worker++)
      if (active[worker]?.finish === tick) active[worker] = null;
    for (const id of selection[mirror]) if ((id - 1) * 25 === tick) pending.push(id);
    for (let worker = 0; worker < workers; worker++)
      if (active[worker] === null && pending.length) {
        const id = pending.shift()!,
          finish = tick + service[id - 1];
        active[worker] = { id, finish };
        out.set(id, { start: tick, finish });
      }
  }
  return out;
}

describe('Shadow Deployment worked example', () => {
  it('derives the documented default flow, queue waits, and paired evidence', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.rows.map((row: { service: number }) => row.service)).toEqual(
        reference.example.service_ms,
      );
      expect(r.rows.map((row: { incumbent: number }) => row.incumbent)).toEqual(
        reference.example.incumbent_predictions,
      );
      expect(r.rows.map((row: { candidate: number }) => row.candidate)).toEqual(
        reference.example.candidate_predictions,
      );
      expect([
        r.mirrored,
        r.onTime,
        r.misses,
        r.pairs,
        r.incumbentErrors,
        r.candidateErrors,
        r.disagreements,
        r.work,
        r.maxWait,
        r.maxElapsed,
        r.liveResponses,
        r.shadowUserResponses,
      ]).toEqual([12, 10, 2, 8, 2, 1, 5, 970, 80, 320, 12, 0]);
      expect(r.rows.map((row: { elapsed: number }) => row.elapsed)).toEqual([
        30, 40, 25, 35, 45, 50, 55, 60, 95, 130, 225, 320,
      ]);
      expect([r.rows[11].arrival, r.rows[11].start, r.rows[11].finish, r.rows[11].wait]).toEqual([
        275, 355, 595, 80,
      ]);
      expect(
        r.slices.map((s: { mirrored: number; onTime: number; pairs: number }) => [
          s.mirrored,
          s.onTime,
          s.pairs,
        ]),
      ).toEqual([
        [8, 8, 7],
        [4, 2, 1],
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('checks all 96 offered settings against an independent discrete-event queue and explicit paired counts', () => {
    const dom = openExample();
    try {
      const cases = get(
        dom,
        `['all','odd','quarter','off'].flatMap(mirror=>[1,2,4].flatMap(workers=>[60,100,150,500].flatMap(deadline=>['partial','complete'].map(labels=>buildReport(mirror,workers,deadline,labels)))))`,
      );
      const cached = new Map<string, ReturnType<typeof oracle>>();
      for (const r of cases) {
        const key = r.mirror + '/' + r.workers;
        if (!cached.has(key)) cached.set(key, oracle(r.mirror, r.workers));
        const schedule = cached.get(key)!;
        const timely = selection[r.mirror].filter(
            (id) => schedule.get(id)!.finish - (id - 1) * 25 <= r.deadline,
          ),
          paired = timely.filter((id) => r.labels === 'complete' || ![8, 10].includes(id));
        expect(r.mirrored).toBe(selection[r.mirror].length);
        expect(r.onTime).toBe(timely.length);
        expect(r.misses).toBe(r.mirrored - timely.length);
        expect(r.pairs).toBe(paired.length);
        expect(r.incumbentErrors).toBe(
          paired.filter((id) => incumbent[id - 1] !== truth[id - 1]).length,
        );
        expect(r.candidateErrors).toBe(
          paired.filter((id) => candidate[id - 1] !== truth[id - 1]).length,
        );
        expect(r.disagreements).toBe(
          timely.filter((id) => incumbent[id - 1] !== candidate[id - 1]).length,
        );
        expect(r.work).toBe(selection[r.mirror].reduce((sum, id) => sum + service[id - 1], 0));
        expect([r.liveResponses, r.shadowUserResponses, r.liveMax]).toEqual([12, 0, 25]);
        for (const row of r.rows) {
          const expected = schedule.get(row.index);
          if (expected) {
            expect([row.start, row.finish, row.wait, row.elapsed]).toEqual([
              expected.start,
              expected.finish,
              expected.start - row.arrival,
              expected.finish - row.arrival,
            ]);
          } else {
            expect(row.mirrored).toBe(false);
            expect(row.start).toBeNull();
          }
        }
      }
      expect(cases).toHaveLength(96);
    } finally {
      dom.window.close();
    }
  });
  it('exposes timeout and label selection effects without changing predictions or incumbent responses', () => {
    const dom = openExample();
    try {
      const full = get(dom, 'buildReport("all",2,500,"partial")'),
        labels = get(dom, 'buildReport("all",2,150,"complete")'),
        small = get(dom, 'buildReport("quarter",2,150,"partial")');
      expect([
        full.onTime,
        full.pairs,
        full.incumbentErrors,
        full.candidateErrors,
        full.work,
      ]).toEqual([12, 10, 3, 3, 970]);
      expect([labels.onTime, labels.pairs, labels.incumbentErrors, labels.candidateErrors]).toEqual(
        [10, 10, 4, 1],
      );
      expect([
        small.mirrored,
        small.work,
        small.pairs,
        small.incumbentErrors,
        small.candidateErrors,
      ]).toEqual([3, 165, 3, 0, 0]);
      expect(
        get(dom, '[60,100,150,500].map(deadline=>buildReport("all",2,deadline,"partial").work)'),
      ).toEqual([970, 970, 970, 970]);
      expect(get(dom, 'buildReport("all",1,150,"partial").maxElapsed')).toBe(695);
      expect(get(dom, 'buildReport("all",4,150,"partial").maxElapsed')).toBe(240);
      expect(full.rows.map((row: { candidate: number }) => row.candidate)).toEqual(candidate);
      expect(
        get(dom, 'makeRequests("partial").filter(row=>row.label===null).map(row=>row.id)'),
      ).toEqual(['R08', 'R10']);
    } finally {
      dom.window.close();
    }
  });
  it('includes deadline equality, retains late work in the queue, and resolves simultaneous worker ties', () => {
    const dom = openExample();
    try {
      const r = get(
        dom,
        `simulate([{...makeRequests('complete')[0],arrival:0,service:10},{...makeRequests('complete')[1],arrival:0,service:10}],'all',1,10)`,
      );
      expect(
        r.map((row: { start: number; finish: number; onTime: boolean }) => [
          row.start,
          row.finish,
          row.onTime,
        ]),
      ).toEqual([
        [0, 10, true],
        [10, 20, false],
      ]);
      const parallel = get(
        dom,
        `simulate([{...makeRequests('complete')[0],arrival:0,service:10},{...makeRequests('complete')[1],arrival:0,service:10}],'all',2,10)`,
      );
      expect(
        parallel.map((row: { worker: number; onTime: boolean }) => [row.worker, row.onTime]),
      ).toEqual([
        [1, true],
        [2, true],
      ]);
      const late = get(
        dom,
        `simulate([{...makeRequests('complete')[0],arrival:0,service:100},{...makeRequests('complete')[1],arrival:10,service:10}],'all',1,20)`,
      );
      expect(
        late.map((row: { start: number; finish: number; onTime: boolean }) => [
          row.start,
          row.finish,
          row.onTime,
        ]),
      ).toEqual([
        [0, 100, false],
        [100, 110, false],
      ]);
      expect(get(dom, 'ratio(0,0)')).toBe('0/0 (undefined)');
      expect(get(dom, 'ratio(0,3)')).toBe('0/3 (0.0%)');
    } finally {
      dom.window.close();
    }
  });
  it('renders undefined rates, detailed timings, label changes, and reset controls on both widths', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      change('#mirror', 'off');
      expect(d.querySelector('#metrics')!.textContent).toContain('undefined');
      expect(d.querySelector('#interpretation')!.textContent).toContain(
        'all twelve incumbent responses remain',
      );
      expect(get(dom, 'report.work')).toBe(0);
      change('#mirror', 'all');
      change('#workers', '1');
      change('#deadline', '500');
      change('#labels', 'complete');
      expect(get(dom, 'report.maxElapsed')).toBe(695);
      expect(d.querySelector('#data')!.textContent).toContain('finish 970');
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(get(dom, '[report.mirror,report.workers,report.deadline,report.labels]')).toEqual([
        'all',
        2,
        150,
        'partial',
      ]);
      expect(d.querySelectorAll('#data tr')).toHaveLength(12);
      expect(d.querySelectorAll('#metrics tr')).toHaveLength(8);
      expect(d.querySelectorAll('#summary tr')).toHaveLength(2);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 620');
      expect(d.querySelector('output')!.textContent).toContain('Shadow user responses: 0');
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
    const article = corpus.entities.find((e) => e.id === 'ml-shadow-deployment')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/shadow-deployment.svg');
    expect(rendered).toContain('/assets/machine-learning/shadow-deployment-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-shadow-deployment.md'), 'utf8');
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

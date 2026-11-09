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
  resolve(root, 'content/assets/widgets/ml-canary-rollout-with-rollback.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-canary-rollout-with-rollback',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));
type WindowEvidence = {
  index: number;
  share: number;
  lag: boolean;
  n: number;
  control: number;
  failures: number;
  controlFailures: number;
  successful: number;
  labeled: number;
  wrong: number;
  decision: string;
};
// Independent replay over routing buckets and binary fixture outcomes, with explicit policy checks.
function oracle(scenario: string, start: number, labels: string, minimum: number, lag: number) {
  const schedule = start === 10 ? [10, 25, 50, 100] : [25, 50, 100];
  const windows: WindowEvidence[] = [];
  let outcome = '',
    stopShare = 0,
    pendingLag = false;
  for (let index = 1; index <= schedule.length + 1; index++) {
    const share = pendingLag ? stopShare : schedule[index - 1];
    const w: WindowEvidence = {
      index,
      share,
      lag: pendingLag,
      n: 0,
      control: 0,
      failures: 0,
      controlFailures: 0,
      successful: 0,
      labeled: 0,
      wrong: 0,
      decision: '',
    };
    for (let bucket = 0; bucket < 100; bucket++) {
      const position = bucket + 1;
      if (bucket >= share) {
        w.control++;
        if (position === 50 || position === 100) w.controlFailures++;
        continue;
      }
      w.n++;
      if (
        scenario === 'serving' &&
        index > 1 &&
        [3, 13, 23, 33, 43, 53, 63, 73, 83, 93].includes(position)
      ) {
        w.failures++;
        continue;
      }
      w.successful++;
      if (labels === 'pending') continue;
      w.labeled++;
      const incorrect =
        scenario === 'quality' && index > 1
          ? [
              5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100,
            ].includes(position)
          : [20, 40, 60, 80, 100].includes(position);
      if (incorrect) w.wrong++;
    }
    if (pendingLag) {
      w.decision = 'RECOVER';
      windows.push(w);
      break;
    }
    if (w.failures * 100 > w.n * 5 || (w.labeled > 0 && w.wrong * 100 > w.labeled * 10))
      w.decision = 'ROLL BACK';
    else if (w.n < minimum || w.labeled !== w.successful || !w.labeled) w.decision = 'HOLD';
    else w.decision = share === 100 ? 'PROMOTE' : 'ADVANCE';
    windows.push(w);
    outcome = w.decision;
    stopShare = share;
    if (w.decision === 'ROLL BACK' && lag) {
      pendingLag = true;
      continue;
    }
    if (w.decision !== 'ADVANCE') break;
  }
  return {
    windows,
    decision: outcome,
    nextShare: outcome === 'ROLL BACK' ? 0 : outcome === 'HOLD' ? stopShare : 100,
    total: windows.length * 100,
    exposed: windows.reduce((n, w) => n + w.n, 0),
    failures: windows.reduce((n, w) => n + w.failures, 0),
    labeled: windows.reduce((n, w) => n + w.labeled, 0),
    wrong: windows.reduce((n, w) => n + w.wrong, 0),
    controlFailures: windows.reduce((n, w) => n + w.controlFailures, 0),
    lagExposure: windows.filter((w) => w.lag).reduce((n, w) => n + w.n, 0),
  };
}
describe('Canary Rollout with Rollback article and executable evidence', () => {
  it('computes the published example and diluted endpoint rate from routed records', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect([r.decision, r.exposed, r.total, r.failures, r.nextShare]).toEqual([
        'ROLL BACK',
        35,
        200,
        3,
        0,
      ]);
      expect([
        r.last.failures,
        r.last.n,
        r.last.wrong,
        r.last.labeled,
        r.last.controlFailures,
        r.last.control,
      ]).toEqual([3, 25, 1, 22, 2, 75]);
      expect((r.last.failures + r.last.controlFailures) / 100).toBe(0.05);
      expect(r.last.failures / r.last.n).toBe(0.12);
      expect(r.exposed).toBe(reference.example.default_candidate_exposure);
      expect(r.last.labeled).toBe(reference.example.default_second_window_candidate_quality_labels);
      expect(
        r.windows[1].rows
          .filter((row: { candidate: boolean; failed: boolean }) => row.candidate && row.failed)
          .map((row: { id: string }) => row.id),
      ).toEqual(['W2-003', 'W2-013', 'W2-023']);
    } finally {
      dom.window.close();
    }
  });
  it('matches an independent request replay for all 48 offered combinations', () => {
    const dom = openExample();
    try {
      for (const scenario of ['serving', 'quality', 'healthy'])
        for (const start of [10, 25])
          for (const labels of ['ready', 'pending'])
            for (const minimum of [10, 30])
              for (const lag of [0, 1]) {
                const actual = get(
                    dom,
                    `simulate('${scenario}',${start},'${labels}',${minimum},${lag})`,
                  ),
                  expected = oracle(scenario, start, labels, minimum, lag);
                for (const field of [
                  'decision',
                  'nextShare',
                  'total',
                  'exposed',
                  'failures',
                  'labeled',
                  'wrong',
                  'controlFailures',
                  'lagExposure',
                ] as const)
                  expect(actual[field]).toEqual(expected[field]);
                expect(
                  actual.windows.map((w: WindowEvidence) =>
                    Object.fromEntries(
                      Object.keys(expected.windows[0]).map((key) => [
                        key,
                        w[key as keyof WindowEvidence],
                      ]),
                    ),
                  ),
                ).toEqual(expected.windows);
                for (const w of actual.windows) {
                  expect(w.rows).toHaveLength(100);
                  expect(w.n + w.control).toBe(100);
                  expect(w.labeled + w.failures).toBeLessThanOrEqual(w.n);
                  for (const row of w.rows) {
                    expect(row.candidate).toBe(row.position <= w.share);
                    expect(row.id).toBe(`W${w.index}-${String(row.position).padStart(3, '0')}`);
                    if (row.failed) expect([row.prediction, row.label]).toEqual([null, null]);
                    else expect([0, 1]).toContain(row.prediction);
                  }
                }
              }
    } finally {
      dom.window.close();
    }
  });
  it('distinguishes gate equality, insufficient evidence, undefined rates, and breach precedence', () => {
    const dom = openExample();
    try {
      const base = '{share:25,n:20,failures:1,labeled:10,successful:10,wrong:1}';
      expect(get(dom, `decide(${base},10).decision`)).toBe('ADVANCE');
      expect(get(dom, `decide({...${base},n:19},10).decision`)).toBe('ROLL BACK');
      expect(get(dom, `decide({...${base},wrong:2},10).decision`)).toBe('ROLL BACK');
      expect(get(dom, `decide({...${base},n:5,failures:1,labeled:0},30).decision`)).toBe(
        'ROLL BACK',
      );
      expect(get(dom, `decide({...${base},wrong:0,labeled:0},10).decision`)).toBe('HOLD');
      expect(get(dom, `decide({...${base},failures:0},30).decision`)).toBe('HOLD');
      expect(get(dom, `decide({...${base},share:100},10).decision`)).toBe('PROMOTE');
      expect(get(dom, 'ratio(0,0)')).toBe('0/0 (undefined)');
      expect(get(dom, 'ratio(1,22)')).toBe('1/22 (4.5%)');
    } finally {
      dom.window.close();
    }
  });
  it('counts lag exposure without erasing previous decisions and separates quality from serving health', () => {
    const dom = openExample();
    try {
      const immediate = get(dom, 'simulate()'),
        lagged = get(dom, "simulate('serving',10,'ready',10,1)");
      expect([lagged.exposed, lagged.total, lagged.failures, lagged.lagExposure]).toEqual([
        60, 300, 6, 25,
      ]);
      expect(lagged.windows.slice(0, 2)).toEqual(immediate.windows);
      expect(lagged.windows[2].decision).toBe('RECOVER');
      const healthy = get(dom, "simulate('healthy')");
      expect([
        healthy.decision,
        healthy.exposed,
        healthy.total,
        healthy.failures,
        healthy.wrong,
      ]).toEqual(['PROMOTE', 185, 400, 0, 8]);
      const bad = get(dom, "simulate('quality')");
      expect([bad.decision, bad.failures, bad.last.wrong, bad.last.labeled]).toEqual([
        'ROLL BACK',
        0,
        5,
        25,
      ]);
      const pending = get(dom, "simulate('quality',10,'pending',10,1)");
      expect([pending.decision, pending.exposed, pending.lagExposure, pending.nextShare]).toEqual([
        'HOLD',
        10,
        0,
        10,
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('updates the visible ledger, handles holds, and resets both layouts', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      expect(d.querySelectorAll('#data tr')).toHaveLength(35);
      change('#lag', '1');
      expect(d.querySelectorAll('#data tr')).toHaveLength(60);
      expect(d.querySelector('#data')!.textContent).toContain('W3-023');
      change('#scenario', 'healthy');
      expect(d.querySelector('output')!.textContent).toContain('PROMOTE');
      change('#labels', 'pending');
      expect(d.querySelector('#history')!.textContent).toContain('undefined');
      expect(d.querySelector('#interpretation')!.textContent).toContain('would keep serving');
      change('#labels', 'ready');
      change('#minimum', '30');
      expect(get(dom, 'report.decision')).toBe('HOLD');
      change('#start', '25');
      expect(get(dom, 'report.exposed')).toBe(25);
      (d.querySelector('#record-tables') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(
        get(dom, '[report.scenario,report.start,report.labels,report.minimum,report.lag]'),
      ).toEqual(['serving', 10, 'ready', 10, 0]);
      expect((d.querySelector('#record-tables') as HTMLDetailsElement).open).toBe(false);
      expect(d.querySelectorAll('#history tr')).toHaveLength(2);
      expect(d.querySelectorAll('#metrics tr')).toHaveLength(6);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 620');
      expect(d.querySelector('#mechanism')!.textContent).toContain(
        '35 candidate requests already served',
      );
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
    const article = corpus.entities.find((e) => e.id === 'ml-canary-rollout-with-rollback')!;
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
    expect(rendered).toContain('/assets/machine-learning/canary-rollout-with-rollback.svg');
    expect(rendered).toContain('/assets/machine-learning/canary-rollout-with-rollback-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-canary-rollout-with-rollback.md'),
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

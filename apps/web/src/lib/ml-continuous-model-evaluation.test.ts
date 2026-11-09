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
  resolve(root, 'content/assets/widgets/ml-continuous-model-evaluation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-continuous-model-evaluation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Continuous Model Evaluation delayed-label joins', () => {
  it('reproduces cohort denominators, slice coverage and later backfills', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'predictions.map(p=>p.prediction)')).toEqual(reference.example.predictions);
      expect(read(dom, 'predictions.map(p=>p.day)')).toEqual(reference.example.prediction_days);
      expect(read(dom, 'outcomes')).toEqual(reference.example.outcomes);
      expect(read(dom, 'arrivals')).toEqual(reference.example.label_arrivals);
      expect(read(dom, 'report.cohorts')).toMatchObject(reference.example.default_cohorts);
      expect(read(dom, 'report.slices')).toMatchObject([
        { name: 'routine', eligible: 2, labeled: 2, coverage: 1 },
        { name: 'complex', eligible: 4, labeled: 0, coverage: 0 },
      ]);
      expect(read(dom, "snapshot(6,'delayed','all').cohorts[1]")).toMatchObject(
        reference.example.day6_recent,
      );
      expect(read(dom, "snapshot(7,'delayed','all').cohorts[1]")).toMatchObject(
        reference.example.day7_recent,
      );
      expect(read(dom, "snapshot(7,'complete','all').cohorts[1]")).toMatchObject({
        labeled: 6,
        errors: 4,
        rate: 4 / 6,
      });
      expect(read(dom, 'report.orphanLabels')).toBe(1);
    } finally {
      dom.window.close();
    }
  });
  it('checks all thirty-six configurations against an independent array-based join oracle', () => {
    const dom = openExample();
    try {
      const f = reference.example;
      for (const day of f.checkpoints)
        for (const timing of f.timings)
          for (const slice of f.slices) {
            const r = read(dom, `snapshot(${day},'${timing}','${slice}')`);
            for (const cohort of [1, 3]) {
              const indices = f.prediction_days
                .map((d: number, i: number) => ({ d, i }))
                .filter(
                  ({ d, i }: { d: number; i: number }) =>
                    d === cohort &&
                    (slice === 'all' || (i % 6 < 2 ? 'routine' : 'complex') === slice),
                )
                .map(({ i }: { i: number }) => i);
              const eligible = day >= cohort + 2 ? indices : [];
              const labeled = eligible.filter((i: number) => {
                const ready = timing === 'complete' ? cohort + 2 : f.label_arrivals[i];
                return ready !== null && ready <= day;
              });
              const errors = labeled.filter(
                (i: number) => f.predictions[i] !== f.outcomes[i],
              ).length;
              const rate = labeled.length ? errors / labeled.length : null,
                coverage = eligible.length ? labeled.length / eligible.length : null;
              const c = r.cohorts.find((c: { cohort: number }) => c.cohort === cohort);
              expect(c).toMatchObject({
                total: indices.length,
                eligible: eligible.length,
                labeled: labeled.length,
                errors,
                rate,
                coverage,
              });
              expect(c.rows.filter((x: { label: number | null }) => x.label !== null)).toHaveLength(
                labeled.length,
              );
            }
          }
    } finally {
      dom.window.close();
    }
  });
  it('joins by identity, ignores unmatched labels and cannot use unavailable future outcomes', () => {
    const dom = openExample();
    try {
      const baseline = read(dom, "snapshot(5,'delayed','all')");
      expect(
        read(dom, "snapshot(5,'delayed','all',predictions,[...labels].reverse()).cohorts"),
      ).toEqual(baseline.cohorts);
      expect(
        read(dom, "snapshot(5,'delayed','all',predictions,labels.filter(l=>l.id!=='X99')).cohorts"),
      ).toEqual(baseline.cohorts);
      // Modify every outcome not available at the audit time, including the one that never arrives.
      expect(
        read(
          dom,
          "snapshot(5,'delayed','all',predictions,labels.map(l=>l.ready===null||l.ready>5?{...l,y:1-l.y}:l)).cohorts",
        ),
      ).toEqual(baseline.cohorts);
      expect(read(dom, "snapshot(8,'delayed','all').rows.find(r=>r.id==='R12')")).toMatchObject({
        eligible: true,
        label: null,
        error: null,
      });
      expect(() =>
        dom.window.eval("snapshot(5,'delayed','all',[...predictions,predictions[0]])"),
      ).toThrow('Duplicate record ID');
      expect(() =>
        dom.window.eval("snapshot(5,'delayed','all',predictions,[...labels,labels[0]])"),
      ).toThrow('Duplicate record ID');
      expect(() => dom.window.eval("snapshot(2,'delayed','all')")).toThrow('Unsupported setting');
    } finally {
      dom.window.close();
    }
  });
  it('handles early labels, zero denominators, exact gate boundaries and incomplete-coverage breaches', () => {
    const dom = openExample();
    try {
      expect(read(dom, "snapshot(4,'delayed','all').cohorts[1]")).toMatchObject({
        eligible: 0,
        labeled: 0,
        rate: null,
        coverage: null,
        status: 'Waiting for age',
      });
      expect(read(dom, "snapshot(5,'delayed','complex').cohorts[1]")).toMatchObject({
        eligible: 4,
        labeled: 0,
        errors: 0,
        rate: null,
        coverage: 0,
        status: 'Too few labels',
      });
      const custom = (n: number, wrong: number) => {
        const preds = Array.from({ length: n }, (_, i) => ({
          id: 'C' + i,
          day: 3,
          slice: 'complex',
          prediction: 0,
          model: 'M1',
          transform: 'T1',
        }));
        const labels = Array.from({ length: 4 }, (_, i) => ({
          id: 'C' + i,
          y: i < wrong ? 1 : 0,
          ready: 5,
        }));
        return read(
          dom,
          `snapshot(5,'delayed','all',${JSON.stringify(preds)},${JSON.stringify(labels)}).cohorts[1]`,
        );
      };
      expect(custom(5, 1)).toMatchObject({
        rate: 0.25,
        coverage: 0.8,
        status: 'No configured breach',
      });
      expect(custom(6, 1)).toMatchObject({
        rate: 0.25,
        coverage: 4 / 6,
        status: 'Incomplete coverage',
      });
      expect(custom(6, 2)).toMatchObject({ rate: 0.5, coverage: 4 / 6, status: 'Investigate' });
    } finally {
      dom.window.close();
    }
  });
  it('changes timing and slice scope without changing predictions and resets controls and optional detail', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        before = dom.window.eval('JSON.stringify({predictions,labels})');
      const change = (id: string, v: string) => {
        const s = d.querySelector(id) as HTMLSelectElement;
        s.value = v;
        s.dispatchEvent(new dom.window.Event('change'));
      };
      change('#day', '4');
      expect(d.querySelector('output')!.textContent).toContain('error N/A');
      change('#day', '7');
      expect(read(dom, 'report.cohorts[1].rate')).toBe(0.6);
      change('#timing', 'complete');
      expect(read(dom, 'report.cohorts[1].rate')).toBe(4 / 6);
      change('#slice', 'complex');
      expect(read(dom, 'report.cohorts[1].rate')).toBe(1);
      expect(d.querySelectorAll('#records tbody tr')).toHaveLength(8);
      expect(dom.window.eval('JSON.stringify({predictions,labels})')).toBe(before);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 840');
      for (const detail of d.querySelectorAll('details'))
        (detail as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({ day: 5, timing: 'delayed', slice: 'all' });
      expect(read(dom, 'report.cohorts')).toMatchObject(reference.example.default_cohorts);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-continuous-model-evaluation')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-monitoring-and-robustness',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/continuous-model-evaluation.svg');
    expect(rendered).toContain('/assets/machine-learning/continuous-model-evaluation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-continuous-model-evaluation.md'),
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
    expect(reference.example_user_queries).toHaveLength(12);
    for (const suffix of ['', '-mobile']) {
      const svg = readFileSync(
        resolve(
          root,
          'content/assets/machine-learning/continuous-model-evaluation' + suffix + '.svg',
        ),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Usable labels 2/6 eligible');
    }
  });
});

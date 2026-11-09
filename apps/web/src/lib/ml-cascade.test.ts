// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-cascade.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-cascade');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Cascade conditional routes, retained positives and work', () => {
  it('matches the worked examples and independent metadata fixtures', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'parts')).toEqual(reference.example.parts);
      const r = read(dom, 'report'),
        f = reference.example.default;
      for (const key of [
        'gateWork',
        'laterWork',
        'totalWork',
        'baselineWork',
        'savedWork',
        'recall',
        'conditionalRecall',
        'retention',
        'baselineRecall',
        'meanWork',
        'continuedPathWork',
      ])
        expect(r[key]).toBeCloseTo(f[key], 12);
      for (const key of ['passed', 'stopped', 'earlyMisses', 'found'])
        expect(r[key].map((p: { id: string }) => p.id)).toEqual(f[key]);
      const strict = read(dom, 'buildReport(0.6)');
      expect(strict.totalWork).toBe(44);
      expect(strict.recall).toBe(0.5);
      const all = read(dom, 'buildReport(0)');
      expect(all.totalWork).toBe(104);
      expect(all.savedWork).toBe(-8);
      const costly = read(dom, "buildReport(0.3,'matching',3,4)");
      expect(costly.totalWork).toBe(44);
      expect(costly.savedWork).toBe(-12);
      const errors = read(dom, "buildReport(0.3,'errors')");
      for (const key of ['found', 'falseAlarms', 'earlyMisses', 'lateMisses'])
        expect(errors[key].map((p: { id: string }) => p.id)).toEqual(
          reference.example.later_errors[key],
        );
      expect(errors.recall).toBe(0.5);
      expect(errors.conditionalRecall).toBeCloseTo(2 / 3);
      expect(errors.baselineRecall).toBe(0.75);
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all thirty-two route, quality and work configurations', () => {
    const dom = openExample();
    try {
      let count = 0;
      const rows = reference.example.parts;
      for (const threshold of reference.example.threshold_choices)
        for (const mode of reference.example.mode_choices)
          for (const gate of reference.example.gate_cost_choices_ms)
            for (const later of reference.example.later_cost_choices_ms) {
              count++;
              const r = read(dom, `buildReport(${threshold},'${mode}',${gate},${later})`);
              const routed = rows.filter((p: { score: number }) => p.score >= threshold),
                passedIds = routed.map((p: { id: string }) => p.id);
              let tp = 0,
                fp = 0,
                fn = 0,
                baselineTp = 0,
                retained = 0;
              for (let i = 0; i < rows.length; i++) {
                const p = rows[i],
                  pass = p.score >= threshold,
                  pred =
                    mode === 'errors' && p.id === 'B'
                      ? 0
                      : mode === 'errors' && p.id === 'E'
                        ? 1
                        : p.later,
                  final = pass ? pred : 0;
                expect(r.cells[i].passed).toBe(pass);
                expect(r.cells[i].final).toBe(final);
                if (p.truth && final) tp++;
                if (!p.truth && final) fp++;
                if (p.truth && !final) fn++;
                if (p.truth && pred) baselineTp++;
                if (p.truth && pass) retained++;
              }
              expect(r.passed.map((p: { id: string }) => p.id)).toEqual(passedIds);
              expect(r.found).toHaveLength(tp);
              expect(r.falseAlarms).toHaveLength(fp);
              expect(r.earlyMisses.length + r.lateMisses.length).toBe(fn);
              expect(r.recall).toBe(tp / 4);
              expect(r.retention).toBe(retained / 4);
              expect(r.conditionalRecall).toBe(tp / retained);
              expect(r.baselineRecall).toBe(baselineTp / 4);
              expect(r.retention * r.conditionalRecall).toBeCloseTo(r.recall, 12);
              const work = 8 * gate + routed.length * later;
              expect(r.totalWork).toBe(work);
              expect(r.baselineWork).toBe(8 * later);
              expect(r.savedWork).toBe(8 * later - work);
              expect(r.meanWork).toBe(work / 8);
              expect(r.continuedPathWork).toBe(gate + later);
              expect(r.savedWork > 0).toBe(r.passFraction < r.breakEvenFraction);
            }
      expect(count).toBe(32);
    } finally {
      dom.window.close();
    }
  });
  it('uses only scores to route, prevents recovery after early exits and handles empty survivor denominators', () => {
    const dom = openExample();
    try {
      const original = read(dom, 'report'),
        rows = read(dom, 'parts');
      rows[3].later = 0;
      const changed = read(dom, `evaluate(${JSON.stringify(rows)},0.3,1,12)`);
      expect(changed.cells.map((p: { final: number }) => p.final)).toEqual(
        original.cells.map((p: { final: number }) => p.final),
      );
      expect(changed.recall).toBe(original.recall);
      expect(changed.baselineRecall).toBe(0.75);
      for (const row of rows) row.truth = 1 - row.truth;
      const flipped = read(dom, `evaluate(${JSON.stringify(rows)},0.3,1,12)`);
      expect(flipped.passed.map((p: { id: string }) => p.id)).toEqual(
        original.passed.map((p: { id: string }) => p.id),
      );
      expect(flipped.totalWork).toBe(original.totalWork);
      expect(read(dom, 'buildReport(0.1).passed.some(p=>p.id==="G")')).toBe(true);
      const none = read(dom, 'evaluate(parts,1,1,12)');
      expect(none.passed).toHaveLength(0);
      expect(none.totalWork).toBe(8);
      expect(none.recall).toBe(0);
      expect(none.conditionalRecall).toBeNull();
      expect(none.precision).toBeNull();
      expect(none.continuedPathWork).toBeNull();
      const equal = read(dom, 'evaluate(parts,0.75,3,4)');
      expect(equal.passFraction).toBe(0.25);
      expect(equal.breakEvenFraction).toBe(0.25);
      expect(equal.savedWork).toBe(0);
      expect(read(dom, 'parts.every(Object.isFrozen)')).toBe(true);
      expect(read(dom, 'parts')).toEqual(reference.example.parts);
    } finally {
      dom.window.close();
    }
  });
  it('rejects invalid rows, truth leakage contracts, work costs and unknown controls', () => {
    const dom = openExample();
    try {
      for (const expr of [
        'evaluate([],0.3,1,12)',
        'evaluate(parts,NaN,1,12)',
        'evaluate(parts,1.1,1,12)',
        'evaluate(parts,0.3,0,12)',
        'evaluate(parts,0.3,1,Infinity)',
        'evaluate([parts[0],parts[0]],0.3,1,12)',
        'evaluate([{...parts[0],truth:null}],0.3,1,12)',
        'evaluate([{...parts[0],later:2}],0.3,1,12)',
        'evaluate([{...parts[0],score:NaN}],0.3,1,12)',
        "evaluate([{...parts[0],id:''}],0.3,1,12)",
        'buildReport(0.4)',
        "buildReport(0.3,'unknown')",
        "buildReport(0.3,'matching',2)",
        "buildReport(0.3,'matching',1,8)",
      ])
        expect(() => dom.window.eval(expr)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('recomputes every control, changes the phone composition and resets all optional details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const e = d.querySelector(id) as HTMLSelectElement;
          e.value = value;
          e.dispatchEvent(new dom.window.Event('change'));
        };
      change('#threshold', '0.6');
      expect(d.querySelector('output')!.textContent).toContain('2/4 defects found');
      change('#mode', 'errors');
      expect(d.querySelector('output')!.textContent).toContain('1/4 defects found');
      expect(d.querySelector('#interpretation')!.textContent).toContain('False alarms: E');
      change('#threshold', '0.3');
      change('#gate', '3');
      change('#later', '4');
      expect(d.querySelector('#work')!.textContent).toContain('Extra work: 12 ms');
      change('#threshold', '0');
      expect(d.querySelector('output')!.textContent).toContain('8/8 reach stage 2');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 730');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        threshold: 0.3,
        mode: 'matching',
        gateCost: 1,
        laterCost: 12,
        totalWork: 68,
      });
      expect(d.querySelectorAll('#routes tbody tr')).toHaveLength(8);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-cascade')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/cascade.svg');
    expect(rendered).toContain('/assets/machine-learning/cascade-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-cascade.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/cascade' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Work: 8 + 60 = 68 ms');
    }
  });
});

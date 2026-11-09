// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
// @ts-expect-error The existing jsdom dependency ships without declarations.
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';
import { loadAndCompileCorpus } from '@patternverse/compiler';
import { renderEntityMarkdown } from '$lib/server/markdown';
const root = resolve(process.cwd(), '../..');
const source = readFileSync(resolve(root, 'content/assets/widgets/ml-multilabel.html'), 'utf8');
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-multilabel');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Multilabel set selection and evaluation', () => {
  it('reproduces the article fixtures, metric counts, per-label F1 and binary loss', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'labels')).toEqual(reference.example.label_order);
      expect(read(dom, 'tickets')).toEqual(reference.example.tickets);
      const check = (r: ReturnType<typeof read>, f: typeof reference.example.default) => {
        expect(r.total).toEqual(f.total);
        for (const key of ['hamming', 'exact', 'micro', 'macro'])
          expect(r[key]).toBeCloseTo(f[key], 12);
      };
      const r = read(dom, 'report');
      check(r, reference.example.default);
      expect(r.predictions.map((p: { predicted: number[] }) => p.predicted)).toEqual(
        reference.example.default.predictions,
      );
      expect(r.inspected.predicted).toEqual([1, 0, 1]);
      expect(r.inspected.id).toBe('C');
      expect(r.perLabel.map((p: { f1: number }) => p.f1)).toEqual([0.8, 2 / 3, 1]);
      check(read(dom, "buildReport(0.5,'0.3')"), reference.example.lower_access);
      check(read(dom, "buildReport(0.5,'shared','one')"), reference.example.forced_one);
      expect(read(dom, "buildReport(0.5,'shared','threshold','A').inspected.bce")).toBeCloseTo(
        reference.example.A_binary_loss_nats,
        12,
      );
    } finally {
      dom.window.close();
    }
  });
  it('checks all seventy-two configurations against independent binary-decision counts', () => {
    const dom = openExample();
    try {
      const originals = read(dom, 'tickets');
      let count = 0;
      for (const threshold of reference.example.threshold_choices)
        for (const access of reference.example.access_choices)
          for (const rule of reference.example.rule_choices)
            for (const inspected of reference.example.tickets) {
              count++;
              const r = read(
                dom,
                `buildReport(${threshold},'${access}','${rule}','${inspected.id}')`,
              );
              let tp = 0,
                fp = 0,
                fn = 0,
                correctSets = 0;
              const byLabel = Array.from({ length: 3 }, () => ({ tp: 0, fp: 0, fn: 0 }));
              for (let row = 0; row < originals.length; row++) {
                const t = originals[row],
                  winner = t.scores.reduce(
                    (best: number, v: number, i: number) => (v > t.scores[best] ? i : best),
                    0,
                  ),
                  bits = [];
                for (let label = 0; label < 3; label++) {
                  const cut = label === 1 && access !== 'shared' ? Number(access) : threshold,
                    p = rule === 'one' ? Number(label === winner) : Number(t.scores[label] >= cut),
                    y = t.truth[label];
                  bits.push(p);
                  if (p && y) {
                    tp++;
                    byLabel[label].tp++;
                  }
                  if (p && !y) {
                    fp++;
                    byLabel[label].fp++;
                  }
                  if (!p && y) {
                    fn++;
                    byLabel[label].fn++;
                  }
                }
                const equal = bits.every((v, i) => v === t.truth[i]);
                if (equal) correctSets++;
                expect(r.predictions[row].predicted).toEqual(bits);
                expect(r.predictions[row].exact).toBe(equal);
                const loss =
                  t.scores.reduce(
                    (s: number, p: number, i: number) => s - Math.log(t.truth[i] ? p : 1 - p),
                    0,
                  ) / 3;
                expect(r.predictions[row].bce).toBeCloseTo(loss, 12);
              }
              expect(r.total).toEqual({ tp, fp, fn });
              expect(r.hamming).toBeCloseTo((fp + fn) / 12, 12);
              expect(r.exact).toBe(correctSets / 4);
              expect(r.micro).toBeCloseTo((2 * tp) / (2 * tp + fp + fn), 12);
              const f1s = byLabel.map((b) => (2 * b.tp) / (2 * b.tp + b.fp + b.fn));
              expect(r.macro).toBeCloseTo(f1s.reduce((s, v) => s + v, 0) / 3, 12);
              expect(r.inspected.id).toBe(inspected.id);
            }
      expect(count).toBe(72);
      expect(read(dom, 'tickets')).toEqual(originals);
    } finally {
      dom.window.close();
    }
  });
  it('preserves empty sets, inclusive thresholds, deterministic ties and undefined-metric conventions', () => {
    const dom = openExample();
    try {
      const negative = [{ id: 'empty', truth: [0, 0, 0], scores: [0.1, 0.1, 0.1] }];
      const empty = read(dom, `evaluate(${JSON.stringify(negative)},[0.5,0.5,0.5])`);
      expect(empty.predictions[0].predicted).toEqual([0, 0, 0]);
      expect(empty.exact).toBe(1);
      expect(empty.hamming).toBe(0);
      expect(empty.micro).toBeNull();
      expect(empty.macro).toBeNull();
      const forced = read(dom, `evaluate(${JSON.stringify(negative)},[1,1,1],'one')`);
      expect(forced.predictions[0].predicted).toEqual([1, 0, 0]);
      expect(forced.total.fp).toBe(1);
      const inclusive = read(
        dom,
        "evaluate([{id:'boundary',truth:[1,1,1],scores:[0.5,0.3,0.7]}],[0.5,0.3,0.7])",
      );
      expect(inclusive.predictions[0].predicted).toEqual([1, 1, 1]);
      expect(
        read(dom, 'evaluate(tickets,[0,0,0]).predictions.every(r=>r.predicted.every(v=>v===1))'),
      ).toBe(true);
      expect(
        read(dom, 'evaluate(tickets,[1,1,1]).predictions.every(r=>r.predicted.every(v=>v===0))'),
      ).toBe(true);
      const a = read(dom, "buildReport(0.5,'shared','threshold','A')"),
        b = read(dom, "buildReport(0.3,'0.7','one','A')");
      expect(a.inspected.scores).toEqual(b.inspected.scores);
      expect(a.inspected.bce).toBe(b.inspected.bce);
      expect(
        read(
          dom,
          'tickets.every(t=>Object.isFrozen(t)&&Object.isFrozen(t.scores)&&Object.isFrozen(t.truth))',
        ),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });
  it('rejects malformed targets, unsupported controls and invalid score or threshold contracts', () => {
    const dom = openExample();
    try {
      for (const expr of [
        'evaluate([], [0.5,0.5,0.5])',
        'evaluate(tickets, [0.5])',
        'evaluate(tickets,[0.5,NaN,0.5])',
        'evaluate(tickets,[0.5,1.1,0.5])',
        "evaluate(tickets,[0.5,0.5,0.5],'unknown')",
        'evaluate([tickets[0],tickets[0]],[0.5,0.5,0.5])',
        "evaluate([{id:'A',truth:[1,null,0],scores:[0.8,0.4,0.1]}],[0.5,0.5,0.5])",
        "evaluate([{id:'A',truth:[1,0],scores:[0.8,0.4,0.1]}],[0.5,0.5,0.5])",
        "evaluate([{id:'A',truth:[1,0,0],scores:[1,0.4,0.1]}],[0.5,0.5,0.5])",
        "evaluate([{id:'A',truth:[1,0,0],scores:[0,0.4,0.1]}],[0.5,0.5,0.5])",
        'buildReport(0.4)',
        "buildReport(0.5,'unknown')",
        "buildReport(0.5,'shared','unknown')",
        "buildReport(0.5,'shared','threshold','unknown')",
      ])
        expect(() => dom.window.eval(expr)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('updates each control, disables thresholds for the forced-one rule and resets state and details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          const e = d.querySelector(id) as HTMLSelectElement;
          e.value = value;
          e.dispatchEvent(new dom.window.Event('change'));
        };
      change('#ticket', 'A');
      expect(d.querySelector('output')!.textContent).toBe(
        'Ticket A: Billing. Reviewed: Billing + Access.',
      );
      change('#access', '0.3');
      expect(d.querySelector('output')!.textContent).toBe(
        'Ticket A: Billing + Access. Reviewed: Billing + Access.',
      );
      expect(read(dom, 'report.micro')).toBeCloseTo(5 / 6, 12);
      change('#threshold', '0.7');
      change('#rule', 'one');
      expect((d.querySelector('#threshold') as HTMLSelectElement).disabled).toBe(true);
      expect((d.querySelector('#access') as HTMLSelectElement).disabled).toBe(true);
      change('#ticket', 'D');
      expect(d.querySelector('output')!.textContent).toBe('Ticket D: Delivery. Reviewed: None.');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 660');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        ticket: 'C',
        rule: 'threshold',
        threshold: 0.5,
        access: 'shared',
      });
      expect((d.querySelector('#threshold') as HTMLSelectElement).disabled).toBe(false);
      expect(d.querySelectorAll('#selected tbody tr')).toHaveLength(3);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-multilabel')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/multilabel.svg');
    expect(rendered).toContain('/assets/machine-learning/multilabel-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-multilabel.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/multilabel' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Selected');
    }
  });
});

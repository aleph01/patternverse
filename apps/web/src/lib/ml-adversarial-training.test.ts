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
  resolve(root, 'content/assets/widgets/ml-adversarial-training.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-adversarial-training');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

const weights = [
  [0, 5],
  [1, 2],
  [1, 0],
];
const logistic = (m: number) => Math.log(1 + Math.exp(-m));
const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1];
describe('Adversarial Training', () => {
  it('reproduces the eight-record fixture, documented model comparison, and exact inspected attack', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.data).toHaveLength(8);
      expect(new Set(r.data.map((x: { id: string }) => x.id)).size).toBe(8);
      expect(r.selected.id).toBe(reference.example.default_model);
      expect(r.selected.cleanAccuracy).toBe(reference.example.default_clean_accuracy);
      expect(r.selected.robustAccuracy).toBe(reference.example.default_robust_accuracy);
      expect(r.selected.worstLoss).toBeCloseTo(reference.example.default_worst_loss, 14);
      expect(r.fits[0].worstLoss).toBeCloseTo(reference.example.default_fragile_worst_loss, 14);
      expect(
        r.fits.map((f: { cleanAccuracy: number; robustAccuracy: number }) => [
          f.cleanAccuracy,
          f.robustAccuracy,
        ]),
      ).toEqual([
        [1, 0],
        [0.75, 0.75],
        [0.75, 0.75],
      ]);
      expect([
        r.point.id,
        r.point.delta,
        r.point.perturbed,
        r.point.margin,
        r.point.worstMargin,
      ]).toEqual(['P1', [-0.25, 0], [0.75, 0.2], 1, 0.75]);
      const expectedClean = [
        logistic(1),
        0.75 * logistic(1.4) + 0.25 * logistic(-0.6),
        0.75 * logistic(1) + 0.25 * logistic(-1),
      ];
      r.fits.forEach((f: { cleanLoss: number }, index: number) =>
        expect(f.cleanLoss).toBeCloseTo(expectedClean[index], 13),
      );
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all 256 configurations, weighted losses, accuracy, and objective winners', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const radius of [0, 0.1, 0.25, 0.5])
        for (const norm of ['linf', 'l2'])
          for (const objective of ['clean', 'robust'])
            for (const choice of ['auto', 'fragile', 'both', 'broad'])
              for (const record of ['P1', 'P4', 'N1', 'N4']) {
                const r = get(
                  dom,
                  `compute(${radius},'${norm}','${objective}','${choice}','${record}')`,
                );
                const goals: number[] = [];
                r.fits.forEach(
                  (
                    fit: {
                      cleanLoss: number;
                      worstLoss: number;
                      cleanAccuracy: number;
                      robustAccuracy: number;
                    },
                    j: number,
                  ) => {
                    const [a, b] = weights[j],
                      penalty =
                        radius *
                        (norm === 'linf' ? Math.abs(a) + Math.abs(b) : Math.sqrt(a * a + b * b)),
                      m = [a + 0.2 * b, -a + 0.2 * b],
                      clean = 0.75 * logistic(m[0]) + 0.25 * logistic(m[1]),
                      worst = 0.75 * logistic(m[0] - penalty) + 0.25 * logistic(m[1] - penalty);
                    expect(fit.cleanLoss).toBeCloseTo(clean, 13);
                    expect(fit.worstLoss).toBeCloseTo(worst, 13);
                    expect(fit.cleanAccuracy).toBe(
                      0.75 * Number(m[0] > 0) + 0.25 * Number(m[1] > 0),
                    );
                    expect(fit.robustAccuracy).toBe(
                      0.75 * Number(m[0] - penalty > 0) + 0.25 * Number(m[1] - penalty > 0),
                    );
                    goals.push(objective === 'clean' ? clean : worst);
                  },
                );
                const index = goals.indexOf(Math.min(...goals));
                expect(r.winner.id).toBe(['fragile', 'both', 'broad'][index]);
                expect(r.selected.id).toBe(choice === 'auto' ? r.winner.id : choice);
                expect(r.point.id).toBe(record);
                count++;
              }
      expect(count).toBe(256);
      expect(count).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('verifies continuous attack optimality against every box corner or a dense circular search', () => {
    const dom = openExample();
    try {
      for (const radius of [0, 0.1, 0.25, 0.5])
        for (const norm of ['linf', 'l2']) {
          const r = get(dom, `compute(${radius},'${norm}','robust','auto','P1')`);
          for (const fit of r.fits)
            for (const row of fit.rows) {
              const candidates: number[][] =
                norm === 'linf'
                  ? [-1, 1].flatMap((a) => [-1, 1].map((b) => [a * radius, b * radius]))
                  : Array.from({ length: 720 }, (_, i) => [
                      radius * Math.cos((i * Math.PI) / 360),
                      radius * Math.sin((i * Math.PI) / 360),
                    ]);
              const searched = Math.min(
                ...candidates.map(
                  (delta) =>
                    row.y *
                    dot(
                      fit.w,
                      row.x.map((v: number, i: number) => v + delta[i]),
                    ),
                ),
              );
              const actual = row.y * dot(fit.w, row.perturbed);
              expect(actual).toBeCloseTo(row.worstMargin, 13);
              expect(actual).toBeLessThanOrEqual(searched + 1e-12);
              expect(searched - actual).toBeLessThanOrEqual(
                5 * radius * (1 - Math.cos(Math.PI / 720)) + 1e-12,
              );
              expect(row.worstLoss).toBeCloseTo(logistic(actual), 13);
              const size =
                norm === 'linf' ? Math.max(...row.delta.map(Math.abs)) : Math.hypot(...row.delta);
              expect(size).toBeCloseTo(radius, 13);
              expect(row.perturbed).toEqual(row.x.map((v: number, i: number) => v + row.delta[i]));
              const cleanPredict = dot(fit.w, row.x) >= 0 ? 1 : -1,
                attackPredict = dot(fit.w, row.perturbed) >= 0 ? 1 : -1;
              expect(row.cleanCorrect).toBe(cleanPredict === row.y);
              expect(row.robustCorrect).toBe(attackPredict === row.y);
            }
        }
    } finally {
      dom.window.close();
    }
  });
  it('separates inspection from fitting, exposes the tradeoff and norm change, and handles boundary ties', () => {
    const dom = openExample();
    try {
      const a = get(dom, 'report'),
        b = get(dom, "compute(.25,'linf','robust','fragile','N4')");
      expect(a.fits).toEqual(b.fits);
      expect(a.winner).toEqual(b.winner);
      expect(b.selected.id).toBe('fragile');
      expect(get(dom, "compute(.25,'linf','clean','auto','P1').selected.id")).toBe('fragile');
      const l2 = get(dom, "compute(.25,'l2','robust','auto','P1')");
      expect(l2.winner.id).toBe('both');
      expect(l2.selected.worstLoss).toBeCloseTo(0.6269143189407677, 13);
      expect(get(dom, "compute(.2,'linf','robust','fragile','P1').selected.robustAccuracy")).toBe(
        0.5,
      );
      expect(get(dom, "compute(.2,'linf','robust','fragile','N1').point.robustCorrect")).toBe(
        false,
      );
      for (const norm of ['linf', 'l2']) {
        let prior: number[] = [0, 0, 0],
          priorAccuracy = [1, 1, 1];
        for (const radius of [0, 0.1, 0.25, 0.5]) {
          const fits = get(dom, `compute(${radius},'${norm}','robust','auto','P1').fits`);
          fits.forEach(
            (f: { worstLoss: number; robustAccuracy: number; cleanLoss: number }, i: number) => {
              expect(f.worstLoss).toBeGreaterThanOrEqual(prior[i]);
              expect(f.robustAccuracy).toBeLessThanOrEqual(priorAccuracy[i]);
              if (radius === 0) expect(f.worstLoss).toBe(f.cleanLoss);
            },
          );
          prior = fits.map((f: { worstLoss: number }) => f.worstLoss);
          priorAccuracy = fits.map((f: { robustAccuracy: number }) => f.robustAccuracy);
        }
      } // The same point (1,0) is within .25 of positive P1 and negative N4.
      for (const row of [a.data[0], a.data[7]])
        expect(Math.hypot(row.x[0] - 1, row.x[1])).toBeLessThan(0.25);
      expect(a.data[0].y).not.toBe(a.data[7].y);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
      expect(a).not.toHaveProperty('test_accuracy');
    } finally {
      dom.window.close();
    }
  });
  it('updates all five controls, resets details, and renders a phone layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, v: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = v;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#fits-data tr')).toHaveLength(3);
      change('#objective', 'clean');
      expect(d.querySelector('output')!.textContent).toContain('Robust 0%');
      change('#radius', '0.1');
      expect(d.querySelector('output')!.textContent).toContain('Robust 100%');
      change('#norm', 'l2');
      change('#model', 'both');
      change('#record', 'N4');
      expect(get(dom, 'report.point.id')).toBe('N4');
      expect(get(dom, 'report.point.robustCorrect')).toBe(false);
      (d.querySelector('#data') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(
        get(dom, '[report.radius,report.norm,report.objective,report.choice,report.record]'),
      ).toEqual([0.25, 'linf', 'robust', 'auto', 'P1']);
      expect((d.querySelector('#data') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 750');
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
    const article = corpus.entities.find((e) => e.id === 'ml-adversarial-training')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-monitoring-and-robustness',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/adversarial-training.svg');
    expect(rendered).toContain('/assets/machine-learning/adversarial-training-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-adversarial-training.md'), 'utf8');
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
    expect(reference.sources).toHaveLength(6);
    expect(reference.example_user_queries).toHaveLength(12);
  });
});

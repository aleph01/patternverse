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
  resolve(root, 'content/assets/widgets/ml-quantize-for-deployment.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-quantize-for-deployment',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

const original = [
  [0.12, -0.08, 0.04],
  [2, -1.5, 0.5],
].map((r) => r.map(Math.fround));
const bias = [0.05, -0.4].map(Math.fround);
const dot = (a: number[], b: number[]) => a.reduce((s, v, i) => s + v * b[i], 0);
// Search the integer lattice rather than repeating the widget's rounding formula.
const nearest = (x: number, s: number, lo: number, hi: number) => {
  const v = x / s,
    candidates = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  return candidates.sort(
    (a, b) => Math.abs(a - v) - Math.abs(b - v) || Math.abs(a % 2) - Math.abs(b % 2),
  )[0];
};
describe('Quantize for Deployment', () => {
  it('reproduces the default packed record and every documented numerical comparison', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report'),
        e = reference.example;
      expect(r.model.qweights).toEqual(e.default_weight_codes);
      expect(r.selected.qx).toEqual(e.default_input_codes);
      expect(r.selected.accumulators).toEqual(e.default_accumulators);
      expect(r.model.bytes).toEqual(e.default_packed_bytes);
      expect(r.model.bytes).toHaveLength(e.default_parameter_bytes);
      expect(r.model.weightBytes).toBe(e.default_weight_bytes);
      expect(r.agreement).toBe(e.default_agreement);
      r.selected.floatScores.forEach((v: number, i: number) =>
        expect(v).toBeCloseTo(e.default_float_scores[i], 14),
      );
      r.selected.scores.forEach((v: number, i: number) =>
        expect(v).toBeCloseTo(e.default_quantized_scores[i], 14),
      );
      expect(get(dom, "compute(4,8,'channel','narrow','D2').model.bytes.length")).toBe(
        e.per_channel_parameter_bytes,
      );
      expect(get(dom, 'quantize(.26,.1,5,0,15)')).toMatchObject({ q: 8, clipped: false });
      expect(get(dom, 'quantize(1.8,.1,5,0,15)')).toMatchObject({
        q: 15,
        clipped: true,
        restored: 1,
      });
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all 96 configurations against a lattice search and decoded byte record', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const wb of [4, 8])
        for (const ab of [4, 8])
          for (const g of ['tensor', 'channel'])
            for (const cal of ['narrow', 'covered', 'outlier'])
              for (const id of ['D1', 'D2', 'D3', 'D4']) {
                const r = get(dom, `compute(${wb},${ab},'${g}','${cal}','${id}')`),
                  m = r.model,
                  channels = g === 'channel' ? 2 : 1,
                  max = 2 ** (wb - 1) - 1,
                  amax = 2 ** ab - 1,
                  scales = (
                    channels === 2 ? original.map((row) => Math.max(...row.map(Math.abs))) : [2]
                  ).map((v) => Math.fround(v / max)),
                  sx = Math.fround(({ narrow: 1, covered: 2, outlier: 8 }[cal] as number) / amax),
                  codes = original.flatMap((row, c) =>
                    row.map((v) => nearest(v, scales[channels === 2 ? c : 0], -max, max)),
                  ),
                  bytes = Uint8Array.from(m.bytes),
                  n = (6 * wb) / 8,
                  view = new DataView(bytes.buffer);
                expect(m.scales).toEqual(scales);
                expect(m.inputScale).toBe(sx);
                expect(m.codes).toEqual(codes);
                expect(bytes).toHaveLength(n + 4 * (channels + 3));
                for (let i = 0; i < 6; i++) {
                  const raw =
                    wb === 8 ? bytes[i] : (bytes[Math.floor(i / 2)] >> ((i % 2) * 4)) & 15;
                  expect(raw >= 2 ** (wb - 1) ? raw - 2 ** wb : raw).toBe(codes[i]);
                }
                [...scales, ...bias, sx].forEach((v, i) =>
                  expect(view.getFloat32(n + 4 * i, true)).toBe(v),
                );
                let agreement = 0;
                for (const row of r.results) {
                  const qx = row.x.map((v: number) => nearest(v, sx, 0, amax)),
                    restored = qx.map((q: number) => q * sx),
                    float = original.map((w, c) => dot(w, row.x) + bias[c]),
                    scores = original.map(
                      (_, c) =>
                        dot(
                          codes
                            .slice(c * 3, c * 3 + 3)
                            .map((q) => q * scales[channels === 2 ? c : 0]),
                          restored,
                        ) + bias[c],
                    );
                  expect(row.qx).toEqual(qx);
                  expect(row.accumulators).toEqual([
                    dot(codes.slice(0, 3), qx),
                    dot(codes.slice(3), qx),
                  ]);
                  row.accumulators.forEach((v: number) =>
                    expect(Math.abs(v)).toBeLessThanOrEqual(97155),
                  );
                  row.scores.forEach((v: number, i: number) =>
                    expect(v).toBeCloseTo(scores[i], 13),
                  );
                  expect(row.floatScores).toEqual(float);
                  expect(row.floatWinner).toBe(float[1] > float[0] ? 'B' : 'A');
                  expect(row.quantizedWinner).toBe(scores[1] > scores[0] ? 'B' : 'A');
                  expect(row.clipped).toBe(
                    row.x.filter((v: number) => v / sx > amax + 0.5 || v / sx < -0.5).length,
                  );
                  row.xValues.forEach((v: { clipped: boolean; error: number }) => {
                    if (!v.clipped) expect(Math.abs(v.error)).toBeLessThanOrEqual(sx / 2 + 1e-14);
                  });
                  if (row.floatWinner === row.quantizedWinner) agreement++;
                }
                expect(r.agreement).toBe(agreement);
                expect(r.selected.id).toBe(id);
                expect(m.calibrationData).toEqual(
                  get(dom, `compute(${wb},${ab},'${g}','${cal}','D1').model.calibrationData`),
                );
                count++;
              }
      expect(count).toBe(reference.example.configurations);
    } finally {
      dom.window.close();
    }
  });
  it('checks signed and unsigned packing, unused nibble padding, quotient ties, and invalid numerical inputs', () => {
    const dom = openExample();
    try {
      for (const bits of [4, 8]) {
        const signed = Array.from({ length: 2 ** bits }, (_, i) => i - 2 ** (bits - 1)),
          unsigned = Array.from({ length: 2 ** bits }, (_, i) => i);
        for (const values of [signed, signed.slice(1), unsigned, unsigned.slice(1)]) {
          const s = values[0] < 0;
          expect(
            get(
              dom,
              `unpack(pack(${JSON.stringify(values)},${bits}),${bits},${values.length},${s})`,
            ),
          ).toEqual(values);
          if (bits === 4 && values.length % 2)
            expect(get(dom, `Array.from(pack(${JSON.stringify(values)},4)).at(-1)`)).toBeLessThan(
              16,
            );
        }
      }
      expect(get(dom, '[.5,1.5,2.5,-.5,-1.5,-2.5].map(roundEven)')).toEqual([0, 2, 2, 0, -2, -2]);
      expect(get(dom, 'quantize(.5,1,3,0,15).q')).toBe(3);
      expect(get(dom, 'quantize(1.5,1,3,0,15).q')).toBe(5);
      for (const expr of [
        'quantize(1,0,0,0,15)',
        'quantize(1,-1,0,0,15)',
        'quantize(Infinity,1,0,0,15)',
        'quantize(1,NaN,0,0,15)',
      ])
        expect(() => dom.window.eval(expr)).toThrow('Values must be finite and scale positive.');
    } finally {
      dom.window.close();
    }
  });
  it('separates weight rounding from input clipping and shows the cost of an unnecessarily wide calibration range', () => {
    const dom = openExample();
    try {
      expect(get(dom, "compute(4,8,'tensor','narrow','D2').selected.quantizedWinner")).toBe('B');
      expect(get(dom, "compute(4,8,'channel','narrow','D2').selected.quantizedWinner")).toBe('A');
      expect(get(dom, "compute(4,8,'channel','narrow','D3').selected")).toMatchObject({
        quantizedWinner: 'B',
        clipped: 1,
      });
      expect(get(dom, "compute(4,8,'channel','covered','D3').selected")).toMatchObject({
        quantizedWinner: 'A',
        clipped: 0,
      });
      expect(get(dom, "compute(4,4,'channel','outlier','D4').selected")).toMatchObject({
        floatWinner: 'B',
        quantizedWinner: 'A',
        clipped: 0,
      });
      expect(get(dom, "compute(4,8,'channel','covered','D2').selected.qx")).toEqual([59, 51, 25]);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
      expect(source).toContain('not task accuracy');
    } finally {
      dom.window.close();
    }
  });
  it('updates every setting and table, restores defaults, and renders the compact layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(d.querySelectorAll('#scores-data tr')).toHaveLength(2);
      expect(d.querySelectorAll('#input-data tr')).toHaveLength(3);
      expect(d.querySelectorAll('#weights-data tr')).toHaveLength(6);
      expect(d.querySelectorAll('#agreement-data tr')).toHaveLength(4);
      change('#granularity', 'channel');
      change('#calibration', 'covered');
      change('#record', 'D3');
      change('#wbits', '8');
      change('#abits', '4');
      expect(
        get(dom, '[report.wbits,report.abits,report.granularity,report.calibration,report.record]'),
      ).toEqual([8, 4, 'channel', 'covered', 'D3']);
      for (const id of ['#values', '#bytes', '#data'])
        (d.querySelector(id) as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(d.querySelectorAll('details[open]')).toHaveLength(0);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 900');
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
    const article = corpus.entities.find((e) => e.id === 'ml-quantize-for-deployment')!;
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
    expect(rendered).toContain('/assets/machine-learning/quantize-for-deployment.svg');
    expect(rendered).toContain('/assets/machine-learning/quantize-for-deployment-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-quantize-for-deployment.md'),
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

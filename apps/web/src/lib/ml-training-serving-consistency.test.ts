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
  resolve(root, 'content/assets/widgets/ml-training-serving-consistency.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-training-serving-consistency',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Training-Serving Consistency fitted state and transform parity', () => {
  it('fits the training state and reproduces the explicit default score change', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'training')).toEqual(reference.example.training);
      expect(read(dom, 'saved')).toEqual(reference.example.saved_state);
      expect(read(dom, 'report.reference.features')).toEqual(
        reference.example.default_reference_features,
      );
      expect(read(dom, 'report.serving.features')).toEqual(
        reference.example.default_serving_features,
      );
      expect(read(dom, 'report.state')).toMatchObject({ mean: 30, scale: 10 });
      expect(read(dom, 'report.reference.score')).toBe(1);
      expect(read(dom, 'report.serving.score')).toBe(-1);
      expect(read(dom, 'report.reference.p')).toBeCloseTo(
        reference.example.default_reference_probability,
        15,
      );
      expect(read(dom, 'report.serving.p')).toBeCloseTo(
        reference.example.default_serving_probability,
        15,
      );
      expect(read(dom, 'report.reference.flag')).toBe(true);
      expect(read(dom, 'report.serving.flag')).toBe(false);
    } finally {
      dom.window.close();
    }
  });
  it('checks all sixteen paths against independently derived vectors and model dot products', () => {
    const dom = openExample();
    try {
      const raw = reference.example.requests as Record<
        string,
        { distance: number | null; service: string }
      >;
      for (const [request, r] of Object.entries(raw))
        for (const mode of reference.example.modes) {
          const out = read(dom, `buildReport('${request}','${mode}')`);
          const mean = mode === 'batch' ? (r.distance === null ? 40 : (r.distance + 40) / 2) : 10;
          const scale =
            mode === 'batch' ? (r.distance === null ? 1 : Math.abs(r.distance - 40) / 2 || 1) : 10;
          const x = r.distance === null ? mean : r.distance;
          let z = (x - mean) / scale;
          if (mode === 'double') z = (z - 10) / 10;
          const standard =
            mode === 'vocabulary'
              ? Number(r.service === 'express')
              : Number(r.service === 'standard');
          const express =
            mode === 'vocabulary'
              ? Number(r.service === 'standard')
              : Number(r.service === 'express');
          const unknown = Number(!['standard', 'express'].includes(r.service));
          const vector = [z, standard, express, unknown];
          expect(out.serving.features).toEqual(vector);
          const score = vector.reduce(
            (sum, v, i) => sum + reference.example.model_weights[i] * v,
            reference.example.model_bias,
          );
          expect(out.serving.score).toBeCloseTo(score, 14);
          expect(out.serving.p).toBeCloseTo(Math.exp(score) / (1 + Math.exp(score)), 14);
          expect(out.serving.flag).toBe(score >= 0);
        }
    } finally {
      dom.window.close();
    }
  });
  it('separates numeric fitting from applying saved state, including missing, unknown and constant inputs', () => {
    const dom = openExample();
    try {
      expect(read(dom, 'fitNumeric([2,4,6,8])')).toEqual({ mean: 5, scale: Math.sqrt(5) });
      expect(read(dom, 'fitNumeric([null,40])')).toEqual({ mean: 40, scale: 1 });
      expect(read(dom, 'fitNumeric([7,7])')).toEqual({ mean: 7, scale: 1 });
      expect(() => dom.window.eval('fitNumeric([null])')).toThrow('At least one');
      expect(read(dom, "buildReport('missing','shared').reference.features")).toEqual([0, 0, 1, 0]);
      expect(read(dom, "buildReport('unknown','shared').reference.features")).toEqual([1, 0, 0, 1]);
      expect(read(dom, "buildReport('missing','shared').reference.flag")).toBe(true);
      for (const request of Object.keys(reference.example.requests)) {
        const out = read(dom, `buildReport('${request}','shared')`);
        expect(out.reference).toEqual(out.serving);
        expect(out.featureMatch).toBe(true);
        expect(out.stateMatch).toBe(true);
      }
      expect(() => dom.window.eval("transform({distance:'20',service:'express'},saved)")).toThrow(
        'Invalid distance',
      );
    } finally {
      dom.window.close();
    }
  });
  it('detects semantic and operation mismatches without claiming one matching vector certifies the state', () => {
    const dom = openExample();
    try {
      expect(read(dom, "buildReport('express','vocabulary').serving.features")).toEqual([
        1, 1, 0, 0,
      ]);
      expect(read(dom, "buildReport('express','double').serving.features")).toEqual([
        -0.9, 0, 1, 0,
      ]);
      expect(read(dom, "buildReport('express','double')")).toMatchObject({
        stateMatch: true,
        operationMatch: false,
        featureMatch: false,
      });
      expect(read(dom, "buildReport('unknown','vocabulary')")).toMatchObject({
        stateMatch: false,
        operationMatch: true,
        featureMatch: true,
      });
      expect(read(dom, "buildReport('missing','batch')")).toMatchObject({
        stateMatch: false,
        featureMatch: true,
      });
      expect(read(dom, 'withinTolerance(1,1+5e-10)')).toBe(true);
      expect(read(dom, 'withinTolerance(1,1+5e-8)')).toBe(false);
      // Equal scalar output can conceal a different feature vector when a coefficient is zero.
      expect(read(dom, 'model([1,0,1,0]).p')).toBe(read(dom, 'model([1,99,1,0]).p'));
      expect(() => dom.window.eval("buildReport('other','shared')")).toThrow('Unsupported setting');
    } finally {
      dom.window.close();
    }
  });
  it('never mutates training state through controls and restores both inputs and optional explanations', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        before = dom.window.eval('JSON.stringify({training,saved})');
      const change = (id: string, v: string) => {
        const s = d.querySelector(id) as HTMLSelectElement;
        s.value = v;
        s.dispatchEvent(new dom.window.Event('change'));
      };
      for (const mode of reference.example.modes)
        for (const request of Object.keys(reference.example.requests)) {
          change('#mode', mode);
          change('#request', request);
        }
      expect(dom.window.eval('JSON.stringify({training,saved})')).toBe(before);
      change('#mode', 'batch');
      change('#request', 'missing');
      expect(d.querySelector('#calculation')!.textContent).toContain(
        '10.0 km on the saved path and 40.0 km on serving',
      );
      change('#request', 'unknown');
      change('#mode', 'vocabulary');
      expect(d.querySelector('#interpretation')!.textContent).toContain('happen to match');
      expect(d.querySelector('#calculation')!.textContent).toContain('no imputation is applied');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 770');
      for (const detail of d.querySelectorAll('details'))
        (detail as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report')).toMatchObject({
        request: 'express',
        mode: 'batch',
        featureMatch: false,
      });
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
    const entity = corpus.entities.find((e) => e.id === 'ml-training-serving-consistency')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-training-and-deployment',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/training-serving-consistency.svg');
    expect(rendered).toContain('/assets/machine-learning/training-serving-consistency-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-training-serving-consistency.md'),
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
          'content/assets/machine-learning/training-serving-consistency' + suffix + '.svg',
        ),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Score 1.000 · p 0.731');
    }
  });
});

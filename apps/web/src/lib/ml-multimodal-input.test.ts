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
  resolve(root, 'content/assets/widgets/ml-multimodal-input.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-multimodal-input');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const read = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Multimodal Input association and fusion', () => {
  it('matches independent metadata fixtures and the worked numerical examples', () => {
    const dom = openExample();
    try {
      const r = read(dom, 'report');
      for (const [key, value] of Object.entries(reference.example.default)) {
        if (typeof value === 'number') expect(r[key]).toBeCloseTo(value, 12);
        else expect(r[key]).toBe(value);
      }
      expect(read(dom, "buildReport(0.2,'0.8').score")).toBeCloseTo(0.56, 12);
      expect(read(dom, "buildReport(0.8,'0.2','same',0.7).score")).toBeCloseTo(
        reference.example.higher_report_weight_score,
        12,
      );
      expect(read(dom, "buildReport(0.8,'missing').score")).toBe(
        reference.example.missing_photo_score,
      );
      expect(read(dom, "buildReport(0.8,'0.2','other').score")).toBeNull();
    } finally {
      dom.window.close();
    }
  });
  it('checks all twenty-four offered configurations against an independent weighted-sum oracle', () => {
    const dom = openExample();
    try {
      let count = 0;
      for (const t of reference.example.text_choices)
        for (const p of reference.example.photo_choices)
          for (const a of reference.example.association_choices)
            for (const w of reference.example.weight_choices) {
              count++;
              const r = read(dom, `buildReport(${t},'${p}','${a}',${w})`);
              const missing = p === 'missing',
                blocked = !missing && a === 'other';
              expect(r.mode).toBe(blocked ? 'blocked' : missing ? 'report-only' : 'paired');
              if (blocked) {
                expect(r.score).toBeNull();
                expect(r.route).toBeNull();
                expect(r.reportContribution).toBeNull();
                expect(r.photoContribution).toBeNull();
              } else {
                const score = missing ? t : w * t + (1 - w) * Number(p);
                expect(r.score).toBeCloseTo(score, 12);
                expect(r.reportContribution).toBeCloseTo((missing ? 1 : w) * t, 12);
                expect(r.photoContribution).toBeCloseTo(missing ? 0 : (1 - w) * Number(p), 12);
                expect(r.route).toBe(score >= 0.6 ? 'Priority review' : 'Standard review');
                expect(r.score).toBeGreaterThanOrEqual(0);
                expect(r.score).toBeLessThanOrEqual(1);
              }
            }
      expect(count).toBe(24);
    } finally {
      dom.window.close();
    }
  });
  it('distinguishes absent from zero evidence, rejects mismatches before scoring and treats the threshold inclusively', () => {
    const dom = openExample();
    try {
      expect(read(dom, "fuse(0.8,null,'A',null,0.4).score")).toBeCloseTo(0.8);
      expect(read(dom, "fuse(0.8,0,'A','A',0.4).score")).toBeCloseTo(0.32);
      expect(read(dom, "fuse(0.8,0.8,'A','B',1).score")).toBeNull();
      expect(read(dom, "fuse(0.6,null,'A',null,0).route")).toBe('Priority review');
      expect(read(dom, "fuse(0.599,null,'A',null,0).route")).toBe('Standard review');
      expect(read(dom, "fuse(0,1,'A','A',0).score")).toBe(1);
      expect(read(dom, "fuse(0,1,'A','A',1).score")).toBe(0);
      expect(read(dom, "buildReport(0.8,'missing','same',0.4)")).toMatchObject({
        photo: null,
        photoId: null,
        usedWeight: 1,
        photoContribution: 0,
      });
      const before = read(dom, 'report');
      read(dom, "buildReport(0.2,'missing','other',0.7)");
      expect(read(dom, 'report')).toEqual(before);
    } finally {
      dom.window.close();
    }
  });
  it('rejects malformed signals, identity contracts, weights and unknown controls', () => {
    const dom = openExample();
    try {
      for (const expr of [
        "fuse(NaN,0.2,'A','A',0.4)",
        "fuse(0.8,Infinity,'A','A',0.4)",
        "fuse(-1,0.2,'A','A',0.4)",
        "fuse(0.8,1.1,'A','A',0.4)",
        "fuse(0.8,0.2,'A','A',-0.1)",
        "fuse(0.8,0.2,'A','A',NaN)",
        "fuse(0.8,0.2,'','A',0.4)",
        "fuse(0.8,0.2,'A',null,0.4)",
        "fuse(0.8,null,'A','B',0.4)",
        'buildReport(0.3)',
        "buildReport(0.8,'unknown')",
        "buildReport(0.8,'0.2','unknown')",
        "buildReport(0.8,'0.2','same',0.5)",
      ])
        expect(() => dom.window.eval(expr)).toThrow();
    } finally {
      dom.window.close();
    }
  });
  it('computes controls, switches to the phone drawing and resets both values and optional details', () => {
    const dom = openExample();
    try {
      const d = dom.window.document;
      const change = (id: string, value: string) => {
        const e = d.querySelector(id) as HTMLSelectElement;
        e.value = value;
        e.dispatchEvent(new dom.window.Event('change'));
      };
      change('#weight', '0.7');
      expect(d.querySelector('output')!.textContent).toContain('0.62');
      change('#photo', 'missing');
      expect(d.querySelector('output')!.textContent).toContain('report-only fallback');
      change('#association', 'other');
      expect(read(dom, 'report.score')).toBe(0.8);
      change('#photo', '0.8');
      expect(d.querySelector('output')!.textContent).toContain('Scoring blocked');
      expect(d.querySelector('#formula')!.textContent).toBe(
        'Fusion is not evaluated. Dashes mark unavailable contributions.',
      );
      change('#association', 'same');
      change('#text', '0.2');
      expect(read(dom, 'report.score')).toBeCloseTo(0.38);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360, configurable: true });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('svg')!.getAttribute('viewBox')).toBe('0 0 328 750');
      for (const e of d.querySelectorAll('details')) (e as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(read(dom, 'report.score')).toBeCloseTo(0.44, 12);
      expect(read(dom, 'report.weight')).toBe(0.4);
      expect(d.querySelectorAll('tbody tr')).toHaveLength(2);
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
    const entity = corpus.entities.find((e) => e.id === 'ml-multimodal-input')!;
    expect(entity).toBeDefined();
    expect(entity.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    expect(entity.languagePracticeSource).toBeFalsy();
    const rendered = await renderEntityMarkdown(entity, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/multimodal-input.svg');
    expect(rendered).toContain('/assets/machine-learning/multimodal-input-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-multimodal-input.md'), 'utf8');
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
        resolve(root, 'content/assets/machine-learning/multimodal-input' + suffix + '.svg'),
        'utf8',
      );
      expect(svg).toContain('data-ml-style="light-editorial"');
      expect(svg).toContain('Score 0.44');
    }
  });
});

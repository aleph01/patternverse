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
  resolve(root, 'content/assets/widgets/ml-schema-based-data-validation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-schema-based-data-validation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Schema-Based Data Validation worked example', () => {
  it('derives the documented row and field findings without releasing passing rows', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect([r.passed, r.flagged, r.violations, r.changes, r.release]).toEqual([
        1,
        5,
        6,
        0,
        false,
      ]);
      expect(r.rows.map((row: { errors: unknown[] }) => row.errors.length)).toEqual(
        reference.example.default_row_violations,
      );
      expect(
        Object.fromEntries(
          r.summary.map((s: { field: string; count: number }) => [s.field, s.count]),
        ),
      ).toEqual(reference.example.default_field_violations);
      expect(
        r.rows.map((row: { errors: { code: string }[] }) => row.errors.map((e) => e.code)),
      ).toEqual([[], ['type'], ['range'], ['domain'], ['type', 'range'], ['missing']]);
      expect(r.rows.map((row: { raw: { distance_km: unknown } }) => row.raw.distance_km)).toEqual([
        12,
        '12',
        -3,
        22,
        null,
        5,
      ]);
      expect(r.rows[5].raw).not.toHaveProperty('delivered_late');
      expect(r.rows[4].raw.distance_km).toBeNull();
      expect(new Set(r.rows.map((row: { id: string }) => row.id)).size).toBe(6);
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all twenty-four dataset, environment, version, and parsing configurations', () => {
    const dom = openExample();
    try {
      const cases = get(
        dom,
        `['source','serving','units'].flatMap(dataset=>['training','serving'].flatMap(environment=>['v1','v2'].flatMap(version=>['strict','decimal'].map(policy=>buildReport(dataset,environment,version,policy)))))`,
      );
      const expected: Record<string, [number, number][]> = {
        'source/training': [
          [1, 6],
          [2, 5],
          [2, 5],
          [3, 4],
        ],
        'source/serving': [
          [1, 10],
          [1, 9],
          [1, 9],
          [1, 8],
        ],
        'serving/training': [
          [0, 11],
          [0, 10],
          [0, 10],
          [0, 9],
        ],
        'serving/serving': [
          [2, 5],
          [3, 4],
          [3, 4],
          [4, 3],
        ],
        'units/training': [
          [6, 0],
          [6, 0],
          [6, 0],
          [6, 0],
        ],
        'units/serving': [
          [0, 6],
          [0, 6],
          [0, 6],
          [0, 6],
        ],
      };
      for (const r of cases) {
        const index = (r.version === 'v2' ? 2 : 0) + (r.policy === 'decimal' ? 1 : 0);
        const [passed, violations] = expected[r.dataset + '/' + r.environment][index];
        expect([r.passed, r.flagged, r.violations, r.release, r.changes]).toEqual([
          passed,
          6 - passed,
          violations,
          violations === 0,
          r.dataset !== 'units' && r.policy === 'decimal' ? 1 : 0,
        ]);
        expect(
          r.rows.reduce((n: number, row: { errors: unknown[] }) => n + row.errors.length, 0),
        ).toBe(violations);
      }
      expect(cases).toHaveLength(24);
    } finally {
      dom.window.close();
    }
  });
  it('verifies field boundaries and type semantics across 4,032 independently tabulated combinations', () => {
    const dom = openExample();
    try {
      const cases = get(
        dom,
        `(()=>{const ds=[0,200,200.1,-.1,null,'12',NaN,Infinity,true,[],{},12],hs=[0,23,24,-1,1.5,null,'9',9],ss=['standard','express','drone','',null,0],ls=[0,1,2,-1,.5,null,'1'];const out=[],contract=makeContract('v1','training');ds.forEach((distance_km,d)=>hs.forEach((pickup_hour,h)=>ss.forEach((service,s)=>ls.forEach((delivered_late,l)=>{const row=validate({id:'edge',values:{distance_km,pickup_hour,service,delivered_late}},contract,'strict');out.push({d,h,s,l,codes:row.errors.map(e=>e.field+':'+e.code),passed:row.passed});}))));return out;})()`,
      );
      const distance = [
          '',
          '',
          'range',
          'range',
          'type',
          'type',
          'type',
          'type',
          'type',
          'type',
          'type',
          '',
        ],
        hour = ['', '', 'range', 'range', 'type', 'type', 'type', ''],
        service = ['', '', 'domain', 'domain', 'type', 'type'],
        label = ['', '', 'domain', 'domain', 'type', 'type', 'type'];
      for (const r of cases) {
        const codes = [
          ['distance_km', distance[r.d]],
          ['service', service[r.s]],
          ['pickup_hour', hour[r.h]],
          ['delivered_late', label[r.l]],
        ]
          .filter(([, code]) => code)
          .map(([field, code]) => field + ':' + code);
        expect(r.codes).toEqual(codes);
        expect(r.passed).toBe(codes.length === 0);
      }
      expect(cases).toHaveLength(4032);
    } finally {
      dom.window.close();
    }
  });
  it('preserves raw data, records conversions, distinguishes missing and null, and exposes semantic blind spots', () => {
    const dom = openExample();
    try {
      const converted = get(dom, 'buildReport("source","training","v1","decimal")');
      expect(converted.rows[1].raw.distance_km).toBe('12');
      expect(converted.rows[1].values.distance_km).toBe(12);
      expect(converted.rows[1].changes).toEqual([{ field: 'distance_km', from: '12', to: 12 }]);
      expect(get(dom, 'original[1].values.distance_km')).toBe('12');
      expect(get(dom, 'normalize({distance_km:""},"decimal").changes')).toEqual([]);
      expect(get(dom, 'normalize({distance_km:"0x10"},"decimal").changes')).toEqual([]);
      expect(get(dom, 'normalize({distance_km:"1e2"},"decimal").changes')).toEqual([]);
      expect(get(dom, 'normalize({distance_km:"-3.5"},"decimal").values.distance_km')).toBe(-3.5);
      const checks = get(
        dom,
        `[{}, {distance_km:null}, {distance_km:0,service:'standard',pickup_hour:0,delivered_late:1,extra:2}].map(values=>validate({id:'case',values},makeContract('v1','training'),'strict').errors)`,
      );
      expect(checks[0].map((e: { code: string }) => e.code)).toEqual([
        'missing',
        'missing',
        'missing',
        'missing',
      ]);
      expect(checks[1][0].code).toBe('type');
      expect(checks[2]).toEqual([
        { field: 'extra', code: 'unexpected', message: 'field not allowed in training' },
      ]);
      expect(get(dom, 'buildReport("units","training","v1","strict").release')).toBe(true);
      expect(12 / 1000).toBe(0.012);
      expect(get(dom, 'makeContract("v1","serving").fields')).not.toHaveProperty('delivered_late');
    } finally {
      dom.window.close();
    }
  });
  it('updates exact findings, escapes raw text, and resets all controls on desktop and phone', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      change('#normalization', 'decimal');
      expect(d.querySelector('output')!.textContent).toContain('Rows passing: 2/6');
      expect(d.querySelector('#data')!.textContent).toContain('Converted "12" → 12');
      change('#version', 'v2');
      expect(d.querySelector('output')!.textContent).toContain('Violations: 4');
      change('#dataset', 'units');
      expect(d.querySelector('output')!.textContent).toContain('Batch eligible');
      expect(d.querySelector('#interpretation')!.textContent).toContain('no unit metadata');
      change('#environment', 'serving');
      expect(d.querySelector('output')!.textContent).toContain('Rows passing: 0/6');
      expect(get(dom, 'escapeHTML("<img onerror=alert(1)>")')).toBe('&lt;img onerror=alert(1)&gt;');
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(get(dom, '[report.dataset,report.environment,report.version,report.policy]')).toEqual([
        'source',
        'training',
        'v1',
        'strict',
      ]);
      expect(d.querySelectorAll('#data tr')).toHaveLength(6);
      expect(d.querySelector('#contract')!.textContent).toContain('"unit": "km"');
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 490');
      expect(d.querySelector('output')!.textContent).toContain('Violations: 6');
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
    const article = corpus.entities.find((e) => e.id === 'ml-schema-based-data-validation')!;
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
    expect(rendered).toContain('/assets/machine-learning/schema-based-data-validation.svg');
    expect(rendered).toContain('/assets/machine-learning/schema-based-data-validation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-schema-based-data-validation.md'),
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

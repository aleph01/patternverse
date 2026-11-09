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
  resolve(root, 'content/assets/widgets/ml-point-in-time-feature-retrieval.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-point-in-time-feature-retrieval',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Point-in-Time Feature Retrieval worked example', () => {
  it('derives the documented two-clock eligibility, ordering, and comparison values', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.rows.map((row: { event: number }) => row.event)).toEqual(
        reference.example.event_minutes,
      );
      expect(r.rows.map((row: { ready: number }) => row.ready)).toEqual(
        reference.example.ready_minutes,
      );
      expect(r.rows.map((row: { value: number }) => row.value)).toEqual(reference.example.values);
      expect(
        r.rows
          .filter((row: { reason: string }) => ['SELECTED', 'Eligible, older'].includes(row.reason))
          .map((row: { id: string }) => row.id),
      ).toEqual(reference.example.default_eligible_ids);
      expect([
        r.known.id,
        r.known.value,
        r.cutoff - r.known.event,
        r.eventOnly.id,
        r.eventOnly.value,
        r.latest.id,
        r.latest.value,
        r.eligible,
      ]).toEqual(['F03', 50, 15, 'F04', 65, 'F05', 90, 2]);
      expect(r.rows.map((row: { reason: string }) => row.reason)).toEqual([
        'Eligible, older',
        'Available later',
        'SELECTED',
        'Available later',
        'Future event',
        'Different entity',
        'Too old',
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('checks all 330 offered configurations against independently tabulated time and age results', () => {
    const dom = openExample();
    try {
      const cases = get(
        dom,
        `['A','B','C'].flatMap(entity=>[480,510,540,542,580,585,587,600,610,615,625].flatMap(cutoff=>[10,15,30,60,120].flatMap(ttl=>['late','early'].map(arrival=>buildReport(entity,cutoff,ttl,arrival)))))`,
      );
      const times = [480, 510, 540, 542, 580, 585, 587, 600, 610, 615, 625];
      const known: Record<number, (string | null)[]> = {
        10: [null, null, null, 'F01', null, null, 'F03', null, 'F05', 'F05', null],
        15: [null, null, null, 'F01', null, null, 'F03', 'F03', 'F05', 'F05', null],
        30: [null, 'F07', null, 'F01', null, null, 'F03', 'F03', 'F05', 'F05', 'F05'],
        60: [null, 'F07', 'F07', 'F01', 'F01', 'F01', 'F03', 'F03', 'F05', 'F05', 'F05'],
        120: [null, 'F07', 'F07', 'F01', 'F01', 'F01', 'F03', 'F03', 'F05', 'F05', 'F05'],
      };
      const eventIds = [
          'F07',
          'F07',
          'F01',
          'F01',
          'F02',
          'F04',
          'F04',
          'F04',
          'F05',
          'F05',
          'F05',
        ],
        eventAges = [0, 30, 0, 2, 10, 0, 2, 15, 5, 10, 20];
      for (const r of cases) {
        const i = times.indexOf(r.cutoff);
        let expectedKnown: string | null = null,
          expectedEvent: string | null = null,
          latest: string | null = null;
        if (r.entity === 'A') {
          expectedKnown = known[r.ttl][i];
          if (
            r.arrival === 'early' &&
            ((r.cutoff === 580 && r.ttl >= 10) || (r.cutoff === 585 && r.ttl >= 15))
          )
            expectedKnown = 'F02';
          expectedEvent = eventAges[i] <= r.ttl ? eventIds[i] : null;
          latest = 'F05';
        } else if (r.entity === 'B') {
          expectedKnown = r.cutoff >= 599 && r.cutoff - 598 <= r.ttl ? 'F06' : null;
          expectedEvent = r.cutoff >= 598 && r.cutoff - 598 <= r.ttl ? 'F06' : null;
          latest = 'F06';
        }
        expect(r.known?.id ?? null).toBe(expectedKnown);
        expect(r.eventOnly?.id ?? null).toBe(expectedEvent);
        expect(r.latest?.id ?? null).toBe(latest);
        expect(r.rows).toHaveLength(7);
        if (r.known) {
          expect(r.known.entity).toBe(r.entity);
          expect(r.known.event).toBeLessThanOrEqual(r.cutoff);
          expect(r.known.ready).toBeLessThanOrEqual(r.cutoff);
          expect(r.cutoff - r.known.event).toBeLessThanOrEqual(r.ttl);
        }
      }
      expect(cases).toHaveLength(330);
    } finally {
      dom.window.close();
    }
  });
  it('enforces inclusive clock and age boundaries and retains zero, null-valued, and missing matches distinctly', () => {
    const dom = openExample();
    try {
      expect(get(dom, 'retrieve([original[0]],"A",600,60).value')).toBe(40);
      expect(get(dom, 'retrieve([original[0]],"A",601,60)')).toBeNull();
      expect(get(dom, 'retrieve([original[0]],"A",541,120)')).toBeNull();
      expect(get(dom, 'retrieve([original[0]],"A",542,120).id')).toBe('F01');
      expect(get(dom, 'retrieve(original.slice(2,4),"A",609,60).id')).toBe('F03');
      expect(get(dom, 'retrieve(original.slice(2,4),"A",610,60).id')).toBe('F04');
      expect(
        get(
          dom,
          'retrieve([{id:"zero",entity:"A",event:600,ready:600,revision:1,value:0}],"A",600,0).value',
        ),
      ).toBe(0);
      expect(
        get(
          dom,
          'retrieve([{id:"future",entity:"A",event:601,ready:590,revision:1,value:3}],"A",600,60)',
        ),
      ).toBeNull();
      expect(get(dom, 'retrieve([{...original[2],value:null}],"A",600,60).id')).toBe('F03');
      expect(get(dom, 'show(retrieve([{...original[2],value:null}],"A",600,60))')).toBe(
        'F03 = null',
      );
      const left = get(
        dom,
        '["A","B","C"].map(entity=>({entity,cutoff:600,feature:retrieve(original,entity,600,10)?.value??null}))',
      );
      expect(left).toEqual([
        { entity: 'A', cutoff: 600, feature: null },
        { entity: 'B', cutoff: 600, feature: 999 },
        { entity: 'C', cutoff: 600, feature: null },
      ]);
    } finally {
      dom.window.close();
    }
  });
  it('filters before version selection, preserves history, rejects ambiguity, and is independent of input ordering', () => {
    const dom = openExample();
    try {
      expect(
        get(
          dom,
          'original.map((_,i)=>retrieve([...original.slice(i),...original.slice(0,i)].reverse(),"A",600,60).id)',
        ),
      ).toEqual(Array(7).fill('F03'));
      expect(
        get(
          dom,
          'retrieve([...original,{...original[2],id:"tie",revision:2,value:55}],"A",600,60).value',
        ),
      ).toBe(55);
      expect(
        get(
          dom,
          'retrieve([...original,{...original[2],id:"ready",ready:588,value:56}],"A",600,60).value',
        ),
      ).toBe(56);
      expect(() =>
        dom.window.eval(
          'retrieve([...original,{...original[2],id:"duplicate",value:999}],"A",600,60)',
        ),
      ).toThrow('Ambiguous duplicate');
      expect(() => dom.window.eval('retrieve([{...original[2],ready:null}],"A",600,60)')).toThrow(
        'non-null integers',
      );
      expect(() => dom.window.eval('retrieve([{...original[2],event:NaN}],"A",600,60)')).toThrow(
        'non-null integers',
      );
      expect(get(dom, 'retrieve(original.filter(row=>row.id!=="F03"),"A",600,60).value')).toBe(40);
      expect(
        get(
          dom,
          '[buildReport("A",580,60,"late").known.value,buildReport("A",580,60,"early").known.value]',
        ),
      ).toEqual([40, 70]);
      expect(get(dom, 'original[1].ready')).toBe(620);
    } finally {
      dom.window.close();
    }
  });
  it('renders real computations, explicit missing results, controls, and resets across widths', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        change = (id: string, value: string) => {
          (d.querySelector(id) as HTMLSelectElement).value = value;
          d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
        };
      change('#ttl', '10');
      expect(d.querySelector('output')!.textContent).toContain('Known at 10:00: null · no match');
      expect(d.querySelector('#interpretation')!.textContent).toContain('decision row is retained');
      change('#ttl', '15');
      expect(d.querySelector('output')!.textContent).toContain('F03 = 50');
      change('#cutoff', '09:40');
      change('#ttl', '60');
      change('#arrival', 'early');
      expect(d.querySelector('output')!.textContent).toContain('Known at 09:40: F02 = 70');
      change('#entity', 'C');
      expect(d.querySelector('output')!.textContent).toContain(
        'Latest in archive: null · no match',
      );
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(get(dom, '[report.entity,report.cutoff,report.ttl,report.arrival]')).toEqual([
        'A',
        600,
        60,
        'late',
      ]);
      expect(d.querySelectorAll('#data tr')).toHaveLength(7);
      expect(d.querySelectorAll('#comparison tr')).toHaveLength(3);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 648');
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
    const article = corpus.entities.find((e) => e.id === 'ml-point-in-time-feature-retrieval')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-inputs-and-features',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/point-in-time-feature-retrieval.svg');
    expect(rendered).toContain(
      '/assets/machine-learning/point-in-time-feature-retrieval-mobile.svg',
    );
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-point-in-time-feature-retrieval.md'),
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

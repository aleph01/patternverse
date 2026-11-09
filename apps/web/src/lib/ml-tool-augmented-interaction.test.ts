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
  resolve(root, 'content/assets/widgets/ml-tool-augmented-interaction.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-tool-augmented-interaction',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });
const get = (dom: JSDOM, expr: string) =>
  JSON.parse(dom.window.eval('JSON.stringify(' + expr + ')'));

describe('Tool-Augmented Interaction', () => {
  it('reproduces the documented reservation, exact arguments, receipt, and separate weight calculation', () => {
    const dom = openExample();
    try {
      const r = get(dom, 'report');
      expect(r.proposal).toEqual({
        name: 'reserve_inventory',
        arguments: { item: 'tripod', quantity: 3 },
      });
      expect(r.envelope).toEqual({ item: 'tripod', quantity: 3, request_key: 'demo-17' });
      expect(r.lookup).toEqual({ item: 'tripod', available: 5 });
      expect(r.final.client).toBe('SUCCESS');
      expect(r.final.available).toBe(2);
      expect(r.final.reservations).toBe(1);
      expect(r.final.toolAttempts).toBe(2);
      expect(r.final.writeAttempts).toBe(1);
      expect(r.final.observed).toEqual({
        status: 'SUCCESS',
        reservation_id: 'R1',
        quantity: 3,
        remaining: 2,
        replayed: false,
      });
      expect(r.final).toEqual(reference.example.default_final);
      const c = reference.example.calculator;
      expect(c.stand_count * c.stand_kg + c.clamp_count * c.clamp_kg).toBe(c.total_kg);
      expect(c.total_kg).toBe(5.35);
    } finally {
      dom.window.close();
    }
  });
  it('independently checks all 64 terminal outcomes, conservation, gates, and bounded tool counts', () => {
    const dom = openExample();
    try {
      let checked = 0;
      for (const q of [0, 1, 3, 6])
        for (const actor of ['clerk', 'viewer'])
          for (const confirmed of [true, false])
            for (const delivery of ['normal', 'lost'])
              for (const limit of [1, 2]) {
                const r = get(dom, `compute(${q},'${actor}',${confirmed},'${delivery}',${limit})`),
                  s = r.final;
                const allowed = q > 0 && actor === 'clerk' && confirmed,
                  committed = allowed && q <= 5;
                const writes = allowed
                  ? committed && delivery === 'lost' && limit === 2
                    ? 2
                    : 1
                  : 0;
                const client =
                  q === 0
                    ? 'INVALID'
                    : actor === 'viewer'
                      ? 'DENIED'
                      : !confirmed
                        ? 'NEEDS_CONFIRMATION'
                        : q > 5
                          ? 'OUT_OF_STOCK'
                          : delivery === 'lost' && limit === 1
                            ? 'UNKNOWN'
                            : 'SUCCESS';
                expect(s.client).toBe(client);
                expect(s.available).toBe(committed ? 5 - q : 5);
                expect(s.reservations).toBe(committed ? 1 : 0);
                expect(s.writeAttempts).toBe(writes);
                expect(s.toolAttempts).toBe(1 + writes);
                expect(writes).toBeLessThanOrEqual(limit);
                if (client === 'SUCCESS')
                  expect(s.observed).toEqual({
                    status: 'SUCCESS',
                    reservation_id: 'R1',
                    quantity: q,
                    remaining: 5 - q,
                    replayed: delivery === 'lost',
                  });
                else if (client === 'OUT_OF_STOCK')
                  expect(s.observed).toEqual({ status: 'OUT_OF_STOCK', available: 5 });
                else expect(s.observed).toBeNull();
                expect(
                  r.events.slice(0, 3).map((e: { writeAttempts: number }) => e.writeAttempts),
                ).toEqual([0, 0, 0]);
                for (const e of r.events) {
                  expect(5 - e.available).toBe(q * e.reservations);
                  expect(e.reservations).toBeLessThanOrEqual(1);
                  expect(e.available).toBeGreaterThanOrEqual(0);
                  expect(e.toolAttempts).toBe(1 + e.writeAttempts);
                }
                checked++;
              }
      expect(checked).toBe(reference.example.configurations);
      expect(checked).toBe(64);
    } finally {
      dom.window.close();
    }
  });
  it('distinguishes uncertain observations from committed effects and retries one immutable envelope', () => {
    const dom = openExample();
    try {
      const lost = get(dom, "compute(3,'clerk',true,'lost',1)"),
        retry = get(dom, "compute(3,'clerk',true,'lost',2)");
      expect(lost.final.client).toBe('UNKNOWN');
      expect(lost.final.observed).toBeNull();
      expect(lost.final.available).toBe(2);
      expect(lost.final.reservations).toBe(1);
      expect(retry.events.slice(0, 4)).toEqual(lost.events);
      expect(retry.final.observed.reservation_id).toBe('R1');
      expect(retry.final.observed.replayed).toBe(true);
      expect(retry.final.available).toBe(lost.final.available);
      expect(retry.final.reservations).toBe(lost.final.reservations);
      expect(retry.final.toolAttempts).toBe(3);
      expect(retry.envelope).toEqual(lost.envelope);
      expect(get(dom, "compute(6,'clerk',true,'lost',2).final.toolAttempts")).toBe(2);
      for (const key of ['model_reply', 'accuracy', 'probability'])
        expect(retry).not.toHaveProperty(key);
      expect(source).not.toMatch(/\bfetch\s*\(|XMLHttpRequest|https?:\/\//);
    } finally {
      dom.window.close();
    }
  });
  it('validates the tool boundary and enforces service idempotency and parameter mismatch rules', () => {
    const dom = openExample();
    try {
      for (const args of [
        "{item:'tripod',quantity:0}",
        "{item:'tripod',quantity:1.5}",
        "{item:'tripod',quantity:'3'}",
        "{item:'tripod',quantity:11}",
        "{item:'camera',quantity:1}",
        "{item:'tripod',quantity:1,role:'clerk'}",
        'null',
        '[]',
      ])
        expect(get(dom, `validateProposal({name:'reserve_inventory',arguments:${args}})`)).toBe(
          'INVALID',
        );
      expect(
        get(
          dom,
          "validateProposal({name:'delete_inventory',arguments:{item:'tripod',quantity:1}})",
        ),
      ).toBe('UNKNOWN_TOOL');
      const results = get(
        dom,
        `(()=>{const s=makeServer(),a={item:'tripod',quantity:1,request_key:'a'};const first=reserve(s,a),again=reserve(s,a),mismatch=reserve(s,{...a,quantity:2}),second=reserve(s,{...a,request_key:'b'}),tooMany=reserve(s,{...a,quantity:10,request_key:'c'});return {first,again,mismatch,second,tooMany,available:s.available,count:s.reservationCount};})()`,
      );
      expect(results.first).toEqual({ ...results.again, replayed: false });
      expect(results.again.replayed).toBe(true);
      expect(results.mismatch.status).toBe('KEY_CONFLICT');
      expect(results.second.reservation_id).toBe('R2');
      expect(results.tooMany.status).toBe('OUT_OF_STOCK');
      expect(results.available).toBe(3);
      expect(results.count).toBe(2);
    } finally {
      dom.window.close();
    }
  });
  it('replays only reached snapshots, recomputes changes, resets controls and details, and draws a phone layout', () => {
    const dom = openExample();
    try {
      const d = dom.window.document,
        initial = d.querySelector('output')!.textContent;
      const change = (id: string, value: string) => {
        (d.querySelector(id) as HTMLSelectElement).value = value;
        d.querySelector(id)!.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      (d.querySelector('#replay') as HTMLButtonElement).click();
      expect(d.querySelectorAll('#trace .example-card')).toHaveLength(1);
      expect(d.querySelector('output')!.textContent).toContain('LOOKUP_READY');
      expect(JSON.parse(d.querySelector('#payload')!.textContent!).scripted_proposal).toBeNull();
      (d.querySelector('#next') as HTMLButtonElement).click();
      expect(d.querySelectorAll('#trace .example-card')).toHaveLength(2);
      expect(d.querySelector('output')!.textContent).toContain('PROPOSED');
      (d.querySelector('#finish') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect((d.querySelector('#next') as HTMLButtonElement).disabled).toBe(true);
      change('#delivery', 'lost');
      change('#limit', '1');
      expect(d.querySelector('output')!.textContent).toContain('UNKNOWN');
      expect(d.querySelector('#state-data')!.textContent).toContain('No reservation receipt');
      change('#actor', 'viewer');
      expect(d.querySelector('output')!.textContent).toContain('DENIED');
      change('#confirmed', 'no');
      change('#quantity', '0');
      expect(d.querySelector('output')!.textContent).toContain('INVALID');
      (d.querySelector('#contract') as HTMLDetailsElement).open = true;
      (d.querySelector('#reset') as HTMLButtonElement).click();
      expect(d.querySelector('output')!.textContent).toBe(initial);
      expect(
        get(dom, '[report.quantity,report.actor,report.confirmed,report.delivery,report.limit]'),
      ).toEqual([3, 'clerk', true, 'normal', 2]);
      expect((d.querySelector('#contract') as HTMLDetailsElement).open).toBe(false);
      Object.defineProperty(dom.window, 'innerWidth', { value: 360 });
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(d.querySelector('#mechanism')!.getAttribute('viewBox')).toBe('0 0 328 1020');
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
    const article = corpus.entities.find((e) => e.id === 'ml-tool-augmented-interaction')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-generative-systems',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/tool-augmented-interaction.svg');
    expect(rendered).toContain('/assets/machine-learning/tool-augmented-interaction-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-tool-augmented-interaction.md'),
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
    expect(reference.sources).toHaveLength(6);
    expect(reference.example_user_queries).toHaveLength(12);
  });
});

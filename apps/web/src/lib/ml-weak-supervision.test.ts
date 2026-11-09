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
  resolve(root, 'content/assets/widgets/ml-weak-supervision.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find((p: { id: string }) => p.id === 'ml-weak-supervision');
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Weak Supervision worked example', () => {
  it('matches the reference matrix, abstentions, and statistics using actual text rules', () => {
    const dom = openExample();
    try {
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(samples.map(s=>labelVotes(s,{refund:true,billing:true,delivery:true,copy:false}).slice(0,3).map(v=>v.value)))',
          ),
        ),
      ).toEqual(reference.example.base_matrix);
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(analyze(samples.map(s=>labelVotes(s,{refund:true,billing:true,delivery:true,copy:false}))))',
          ),
        ),
      ).toEqual(reference.example.base_statistics);
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(samples.map(s=>aggregate(labelVotes(s,{refund:true,billing:true,delivery:true,copy:false}),false).share))',
          ),
        ),
      ).toEqual(reference.example.base_refund_shares);
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(labelVotes("REFUND charged"+String.fromCharCode(10)+" twice DELIVERED",{refund:true,billing:true,delivery:true,copy:false}).map(v=>v.value))',
          ),
        ),
      ).toEqual([1, 1, 0, -1]);
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(labelVotes("refundable undelivered overcharged twice",{refund:true,billing:true,delivery:true,copy:false}).map(v=>v.value))',
          ),
        ),
      ).toEqual([-1, -1, -1, -1]);
    } finally {
      dom.window.close();
    }
  });

  it('shows the copied-source flip without changing the known-family aggregation', () => {
    const dom = openExample();
    try {
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '40.0% Refund share → Other',
      );
      dom.window.document.querySelector('#copy').click();
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Every column: 57.1% Refund share → Refund. Copy once: 40.0% Refund share → Other.',
      );
      expect(
        dom.window.eval(
          'aggregate(labelVotes(samples[0],{refund:true,billing:true,delivery:true,copy:true}),false).share',
        ),
      ).toBeCloseTo(4 / 7, 12);
      expect(
        dom.window.eval(
          'aggregate(labelVotes(samples[0],{refund:true,billing:true,delivery:true,copy:true}),true).share',
        ),
      ).toBe(reference.example.count_copy_once_refund_share_for_a);
    } finally {
      dom.window.close();
    }
  });

  it('agrees with independent arithmetic for all source selections and both copy states', () => {
    const dom = openExample();
    try {
      const results = JSON.parse(
        dom.window.eval(
          'JSON.stringify((()=>{const out=[];for(let mask=0;mask<16;mask++){const enabled=Object.fromEntries(rules.map((r,i)=>[r.id,Boolean(mask&(1<<i))]));for(const text of samples)out.push({mask,text,naive:aggregate(labelVotes(text,enabled),false),grouped:aggregate(labelVotes(text,enabled),true)});}return out;})())',
        ),
      );
      for (const result of results) {
        const m = result.mask;
        const r = Boolean(m & 1) && /\brefund\b/i.test(result.text);
        const b = Boolean(m & 2) && /\bcharged\s+twice\b/i.test(result.text);
        const d = Boolean(m & 4) && /\bdelivered\b/i.test(result.text);
        const copy = Boolean(m & 8) && r;
        for (const [actual, refund] of [
          [result.naive, 2 * Number(r) + Number(b) + 2 * Number(copy)],
          [result.grouped, 2 * Number(r) + Number(b)],
        ] as const) {
          const other = 3 * Number(d),
            total = refund + other;
          expect(actual.refund).toBe(refund);
          expect(actual.other).toBe(other);
          expect(actual.share).toBe(total ? refund / total : null);
          expect(actual.label).toBe(
            !total
              ? 'No weak label'
              : refund === other
                ? 'Unresolved tie'
                : refund > other
                  ? 'Refund'
                  : 'Other',
          );
        }
      }
      expect(results).toHaveLength(64);
    } finally {
      dom.window.close();
    }
  });

  it('keeps ties and absent evidence distinct, handles edits safely, and resets all settings', () => {
    const dom = openExample();
    try {
      const ticket = dom.window.document.querySelector('#ticket');
      ticket.value = 'Refund charged twice delivered';
      ticket.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '50.0% Refund share → Unresolved tie',
      );
      ticket.value = '<img src=x onerror=alert(1)>';
      ticket.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain('no weak label');
      expect(dom.window.document.querySelectorAll('img')).toHaveLength(0);
      dom.window.document.querySelector('#copy').click();
      dom.window.document.querySelector('#refund').click();
      expect(dom.window.document.querySelector('#copy').disabled).toBe(true);
      dom.window.document.querySelector('#reset').click();
      expect(ticket.value).toBe(reference.example.samples[0]);
      expect(dom.window.document.querySelector('#copy').checked).toBe(false);
      expect(dom.window.document.querySelector('#copy').disabled).toBe(false);
      expect(dom.window.document.querySelector('output').textContent).toContain('40.0%');
      expect(dom.window.document.querySelector('#metrics').textContent).toContain(
        'coverage 3/4; overlap 2/4; conflict 1/4',
      );
    } finally {
      dom.window.close();
    }
  });

  it('recalculates corpus diagnostics when a source is disabled', () => {
    const dom = openExample();
    try {
      dom.window.document.querySelector('#delivery').click();
      expect(dom.window.document.querySelector('#metrics').textContent).toContain(
        'coverage 2/4; overlap 1/4; conflict 0/4',
      );
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '100.0% Refund share → Refund',
      );
      for (const id of ['refund', 'billing']) dom.window.document.querySelector('#' + id).click();
      expect(dom.window.document.querySelector('#metrics').textContent).toContain(
        'coverage 0/4; overlap 0/4; conflict 0/4',
      );
      expect(dom.window.document.querySelector('output').textContent).toContain('no weak label');
    } finally {
      dom.window.close();
    }
  });

  it('integrates metadata, sources, fixed sections, illustrations, and a widget without a practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-weak-supervision')!;
    expect(article.languagePracticeSource).toBeFalsy();
    expect(article.verseMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning',
    });
    expect(article.collectionMemberships).toContainEqual({
      sourceId: 'commons',
      entityId: 'machine-learning-learning-and-adaptation',
    });
    const rendered = await renderEntityMarkdown(article, corpus.entities);
    expect(rendered).toContain('/assets/machine-learning/weak-supervision-votes.svg');
    expect(rendered).toContain('/assets/machine-learning/weak-supervision-votes-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-weak-supervision.md'), 'utf8');
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
    expect(reference.example_user_queries.length).toBeGreaterThanOrEqual(8);
  });
});

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
  resolve(root, 'content/assets/widgets/ml-self-supervised-pretraining.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-self-supervised-pretraining',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Self-Supervised Pretraining worked example', () => {
  it('constructs 20 targets with the documented causal and masked visibility rules', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('fit(sentences,"causal").examples.length')).toBe(20);
      expect(dom.window.eval('fit(sentences,"masked").examples.length')).toBe(20);
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(makeExample(["the","parcel","arrived","late"],1,"causal"))',
          ),
        ),
      ).toEqual({ input: 'the', target: 'parcel', context: ['the'] });
      expect(
        JSON.parse(
          dom.window.eval(
            'JSON.stringify(makeExample(["the","parcel","arrived","late"],1,"masked"))',
          ),
        ),
      ).toEqual({
        input: 'the [MASK] arrived late',
        target: 'parcel',
        context: ['the', 'arrived'],
      });
      expect(dom.window.eval('makeExample(sentences[0],0,"causal").input')).toBe('[BOS]');
      expect(JSON.parse(dom.window.eval('JSON.stringify(vocabulary)'))).toEqual(
        reference.example.vocabulary,
      );
      expect(dom.window.eval('queries.every(q=>!trainingLines.includes(q))')).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('matches exact counts, smoothing arithmetic, loss, and an unseen masked context', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(
        dom.window.eval(
          'JSON.stringify(score(fit(sentences,"causal"),queries[0].split(" "),3,"causal",1))',
        ),
      );
      expect(result.total).toBe(5);
      expect(result.observed).toBe(1);
      expect(result.denominator).toBe(13);
      expect(result.probability).toBeCloseTo(2 / 13, 14);
      expect(result.loss).toBeCloseTo(Math.log(13) - Math.log(2), 14);
      expect(result.loss).toBeCloseTo(reference.example.default_loss_nats, 14);
      const masked = JSON.parse(
        dom.window.eval(
          'JSON.stringify(score(fit(sentences,"masked"),queries[0].split(" "),2,"masked",1))',
        ),
      );
      expect(masked.context).toEqual(['parcel', 'safely']);
      expect(masked.total).toBe(0);
      expect(
        masked.distribution.every((p: { probability: number }) => p.probability === 1 / 8),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('agrees with manually counted context tables across all 48 offered configurations', () => {
    const dom = openExample();
    try {
      const rows = JSON.parse(
        dom.window.eval(
          'JSON.stringify((()=>{const out=[];for(const mode of ["causal","masked"])for(const query of queries)for(let index=0;index<4;index++)for(const alpha of [0.5,1,2])out.push({mode,query,index,alpha,result:score(fit(sentences,mode),query.split(" "),index,mode,alpha)});return out;})())',
        ),
      );
      const causal: Record<string, Record<string, number>> = {
        '[BOS]': { the: 5 },
        the: { parcel: 3, refund: 2 },
        parcel: { arrived: 3 },
        refund: { arrived: 2 },
        arrived: { late: 2, early: 1, safely: 1, quickly: 1 },
      };
      const masked: Record<string, Record<string, number>> = {
        '[BOS]|parcel': { the: 3 },
        '[BOS]|refund': { the: 2 },
        'the|arrived': { parcel: 3, refund: 2 },
        'parcel|late': { arrived: 2 },
        'parcel|early': { arrived: 1 },
        'refund|safely': { arrived: 1 },
        'refund|quickly': { arrived: 1 },
        'arrived|[EOS]': { late: 2, early: 1, safely: 1, quickly: 1 },
      };
      for (const { mode, query, index, alpha, result } of rows) {
        const words = query.split(' ');
        const key =
          mode === 'causal'
            ? words[index - 1] || '[BOS]'
            : (words[index - 1] || '[BOS]') + '|' + (words[index + 1] || '[EOS]');
        const counts = (mode === 'causal' ? causal : masked)[key] || {};
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        const expected = ((counts[words[index]] || 0) + alpha) / (total + 8 * alpha);
        expect(result.probability).toBeCloseTo(expected, 14);
        expect(result.loss).toBeCloseTo(-Math.log(expected), 14);
        expect(
          result.distribution.reduce(
            (sum: number, p: { probability: number }) => sum + p.probability,
            0,
          ),
        ).toBeCloseTo(1, 14);
        expect(result.distribution.every((p: { probability: number }) => p.probability > 0)).toBe(
          true,
        );
      }
      expect(rows).toHaveLength(48);
    } finally {
      dom.window.close();
    }
  });

  it('counts duplicates and preserves the training/query separation during scoring', () => {
    const dom = openExample();
    try {
      expect(
        dom.window.eval(
          'fit(sentences,"causal").counts.get(JSON.stringify(["arrived"])).get("late")',
        ),
      ).toBe(2);
      expect(
        dom.window.eval(
          'fit([...new Map(sentences.map(s=>[s.join(" "),s])).values()],"causal").counts.get(JSON.stringify(["arrived"])).get("late")',
        ),
      ).toBe(1);
      expect(
        dom.window.eval(
          '(()=>{const model=fit(sentences,"causal");const before=JSON.stringify([...model.counts].map(([k,v])=>[k,[...v]]));score(model,queries[0].split(" "),3,"causal",1);return before===JSON.stringify([...model.counts].map(([k,v])=>[k,[...v]]));})()',
        ),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('recalculates objective and query settings and resets every control', () => {
    const dom = openExample();
    try {
      const set = (id: string, value: string) => {
        const input = dom.window.document.querySelector('#' + id);
        input.value = value;
        input.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      };
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '15.4% probability; 1.872 nats',
      );
      set('query', '1');
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '23.1% probability; 1.466 nats',
      );
      set('objective', 'masked');
      set('position', '2');
      set('alpha', '2');
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '12.5% probability; 2.079 nats',
      );
      dom.window.document.querySelector('#reset').click();
      expect(dom.window.document.querySelector('#query').value).toBe('0');
      expect(dom.window.document.querySelector('#objective').value).toBe('causal');
      expect(dom.window.document.querySelector('#position').value).toBe('3');
      expect(dom.window.document.querySelector('#alpha').value).toBe('1');
      expect(dom.window.document.querySelector('output').textContent).toContain(
        '15.4% probability; 1.872 nats',
      );
    } finally {
      dom.window.close();
    }
  });

  it('integrates the article structure, metadata, references, responsive diagram, and widget', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-self-supervised-pretraining')!;
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
    expect(rendered).toContain('/assets/machine-learning/self-supervised-pretraining.svg');
    expect(rendered).toContain('/assets/machine-learning/self-supervised-pretraining-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-self-supervised-pretraining.md'),
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
    expect(reference.example_user_queries.length).toBeGreaterThanOrEqual(8);
  });
});

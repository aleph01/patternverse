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
  resolve(root, 'content/assets/widgets/ml-knowledge-distillation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-knowledge-distillation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Knowledge Distillation worked example', () => {
  it('matches independent teacher probabilities and stable log-softmax identities', () => {
    const dom = openExample();
    try {
      for (const t of [1, 2, 4]) {
        const actual = JSON.parse(dom.window.eval('JSON.stringify(softmax([4,2,0],' + t + '))'));
        actual.forEach((v: number, i: number) =>
          expect(v).toBeCloseTo(reference.example.aligned_teacher_probabilities[String(t)][i], 14),
        );
        const shifted = JSON.parse(
          dom.window.eval('JSON.stringify(softmax([1004,1002,1000],' + t + '))'),
        );
        shifted.forEach((v: number, i: number) => expect(v).toBeCloseTo(actual[i], 12));
        expect(actual.reduce((a: number, b: number) => a + b, 0)).toBeCloseTo(1, 14);
      }
      expect(dom.window.eval('measure([4,2,0],[4,2,0],2,1).kl')).toBe(0);
      expect(dom.window.eval('winner(softmax([0,0,0]))')).toBe('Tie');
    } finally {
      dom.window.close();
    }
  });

  it('matches the checked initial loss, first update, and tenth-step deployment probability', () => {
    const dom = openExample();
    try {
      const initial = JSON.parse(
        dom.window.eval('JSON.stringify(measure(session.logits,session.teacher,2,0.5))'),
      );
      expect(initial.ce).toBeCloseTo(Math.log(3), 14);
      expect(initial.scaled).toBeCloseTo(reference.example.initial.scaled_kl, 14);
      expect(initial.total).toBeCloseTo(reference.example.initial.total, 14);
      dom.window.document.querySelector('#one').click();
      const logits = JSON.parse(dom.window.eval('JSON.stringify(session.logits)'));
      logits.forEach((v: number, i: number) =>
        expect(v).toBeCloseTo(reference.example.after_one_step.logits[i], 14),
      );
      expect(dom.window.eval('measure(session.logits,session.teacher,2,0.5).total')).toBeCloseTo(
        reference.example.after_one_step.total,
        14,
      );
      dom.window.eval('advance(session,9)');
      const end = JSON.parse(
        dom.window.eval('JSON.stringify(measure(session.logits,session.teacher,2,0.5))'),
      );
      expect(end.total).toBeCloseTo(reference.example.after_ten_steps.total, 14);
      expect(end.r[0]).toBeCloseTo(
        reference.example.after_ten_steps.inference_delivery_probability,
        14,
      );
    } finally {
      dom.window.close();
    }
  });

  it('checks the analytic gradient against finite differences and descent across every offered setting', () => {
    const dom = openExample();
    try {
      const checked = dom.window.eval(
        '(()=>{let states=0,coordinates=0;for(const teacher of Object.values(teachers))for(const t of [1,2,4])for(const a of [0,0.25,0.5,0.75,1]){const state=startSession(teacher,t,a);let prior=Infinity;for(let step=0;step<=20;step++){const m=measure(state.logits,state.teacher,t,a);if(m.total>prior+1e-10)throw Error("not descending");if(m.kl < -1e-10)throw Error("negative KL");if(Math.abs(m.gradient.reduce((x,y)=>x+y,0))>1e-10)throw Error("gradient mass");if(JSON.stringify(state.teacher)!==JSON.stringify(teacher))throw Error("teacher changed");prior=m.total;states++;if(step<20)advance(state);}for(const z of [[0,0,0],[1,-1,0.5]]){const g=measure(z,teacher,t,a).gradient;for(let i=0;i<3;i++){const plus=[...z],minus=[...z],h=1e-5;plus[i]+=h;minus[i]-=h;const fd=(measure(plus,teacher,t,a).total-measure(minus,teacher,t,a).total)/(2*h);if(Math.abs(fd-g[i])>1e-7)throw Error("wrong gradient");coordinates++;}}}return JSON.stringify({states,coordinates});})()',
      );
      expect(JSON.parse(checked)).toEqual({ states: 630, coordinates: 180 });
    } finally {
      dom.window.close();
    }
  });

  it('exposes a wrong teacher improving imitation while worsening true-label fit', () => {
    const dom = openExample();
    try {
      const result = JSON.parse(
        dom.window.eval(
          '(()=>{const s=startSession(teachers.wrong,2,1);const before=measure(s.logits,s.teacher,2,1);advance(s,10);return JSON.stringify({before,after:measure(s.logits,s.teacher,2,1)});})()',
        ),
      );
      expect(result.after.scaled).toBeLessThan(result.before.scaled);
      expect(result.after.ce).toBeGreaterThan(result.before.ce);
      expect(result.after.scaled).toBeCloseTo(
        reference.example.wrong_teacher_only_after_ten.scaled_kl,
        14,
      );
      expect(result.after.ce).toBeCloseTo(reference.example.wrong_teacher_only_after_ten.ce, 14);
      expect(result.after.r[1]).toBeCloseTo(
        reference.example.wrong_teacher_only_after_ten.inference_billing_probability,
        14,
      );
      expect(
        dom.window.eval(
          'measure([1,0,-1],teachers.aligned,4,0).total===measure([1,0,-1],teachers.wrong,1,0).total',
        ),
      ).toBe(true);
    } finally {
      dom.window.close();
    }
  });

  it('restarts on settings changes, stops at the step limit, and resets all inputs', () => {
    const dom = openExample();
    try {
      dom.window.document.querySelector('#ten').click();
      dom.window.document.querySelector('#ten').click();
      expect(dom.window.document.querySelector('#one').disabled).toBe(true);
      expect(dom.window.eval('session.step')).toBe(20);
      const alpha = dom.window.document.querySelector('#alpha');
      alpha.value = '1';
      alpha.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      expect(dom.window.eval('session.step')).toBe(0);
      expect(dom.window.document.querySelector('#one').disabled).toBe(false);
      dom.window.document.querySelector('#one').click();
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(dom.window.eval('session.step')).toBe(1);
      dom.window.document.querySelector('#reset').click();
      expect(alpha.value).toBe('0.5');
      expect(dom.window.document.querySelector('#temperature').value).toBe('2');
      expect(dom.window.document.querySelector('#teacher').value).toBe('aligned');
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Step 0/20 · total loss 1.082',
      );
    } finally {
      dom.window.close();
    }
  });

  it('integrates references, metadata, fixed sections, responsive graphics, and a widget without practice', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-knowledge-distillation')!;
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
    expect(rendered).toContain('/assets/machine-learning/knowledge-distillation.svg');
    expect(rendered).toContain('/assets/machine-learning/knowledge-distillation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(resolve(root, 'content/patterns/ml-knowledge-distillation.md'), 'utf8');
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

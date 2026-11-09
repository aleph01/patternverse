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
  resolve(root, 'content/assets/widgets/ml-label-preserving-augmentation.html'),
  'utf8',
);
const metadata = JSON.parse(
  readFileSync(resolve(root, 'docs/pattern-packages/machine-learning.json'), 'utf8'),
);
const reference = metadata.patterns.find(
  (p: { id: string }) => p.id === 'ml-label-preserving-augmentation',
);
const openExample = () => new JSDOM(source, { runScripts: 'dangerously' });

describe('Label-Preserving Augmentation worked example', () => {
  it('matches the source and exact horizontal and vertical pixel transformations', () => {
    const dom = openExample();
    try {
      const original = JSON.parse(dom.window.eval('JSON.stringify(original)'));
      expect(original.map((r: number[]) => r.map((v) => Number(v > 0)).join(''))).toEqual(
        reference.example.source_mask,
      );
      expect(original.flat().filter((v: number) => v > 0)).toHaveLength(26);
      const flipped = JSON.parse(
        dom.window.eval('JSON.stringify(transform(original,true,false,100))'),
      );
      expect(flipped[0]).toEqual([0, 0, 0, 0, 100, 0, 0, 0]);
      expect(flipped[3]).toEqual([0, 100, 100, 100, 100, 100, 100, 100]);
      expect(
        dom.window.eval(
          'JSON.stringify(transform(transform(original,true,false,100),true,false,100))===JSON.stringify(original)',
        ),
      ).toBe(true);
      expect(
        dom.window.eval(
          'JSON.stringify(transform(original,false,true,100))===JSON.stringify(original)',
        ),
      ).toBe(true);
      expect(JSON.parse(dom.window.eval('JSON.stringify(original)'))).toEqual(original);
    } finally {
      dom.window.close();
    }
  });

  it('checks labels and independently derived pixel counts across all 40 offered states', () => {
    const dom = openExample();
    try {
      const results = JSON.parse(
        dom.window.eval(
          'JSON.stringify((()=>{const out=[];for(const horizontal of [false,true])for(const vertical of [false,true])for(const contrast of [0,25,50,75,100])for(const task of ["presence","direction"]){const grid=transform(original,horizontal,vertical,contrast);out.push({horizontal,vertical,contrast,task,result:inspect(grid,task,contrast),grid});}return out;})())',
        ),
      );
      const base = reference.example.source_mask.map((r: string) =>
        [...r].map(Number).map((v) => v * 100),
      );
      for (const { horizontal, vertical, contrast, task, result, grid } of results) {
        const after =
          contrast === 0
            ? task === 'presence'
              ? 'No arrow'
              : 'Undefined'
            : task === 'presence'
              ? 'Arrow present'
              : horizontal
                ? 'Left'
                : 'Right';
        expect(result.after).toBe(after);
        expect(result.status).toBe(
          after === 'Undefined'
            ? 'unsupported'
            : after === (task === 'presence' ? 'Arrow present' : 'Right')
              ? 'valid'
              : 'invalid',
        );
        expect(result.changed).toBe(
          contrast === 0 ? 26 : contrast === 100 ? (horizontal ? 12 : 0) : horizontal ? 32 : 26,
        );
        expect(result.foreground).toBe(contrast === 0 ? 0 : 26);
        expect(result.unique).toBe(contrast === 0 ? 1 : 2);
        for (let r = 0; r < 8; r++)
          for (let c = 0; c < 8; c++)
            expect(grid[r][c]).toBe(
              (base[vertical ? 7 - r : r][horizontal ? 7 - c : c] * contrast) / 100,
            );
      }
      expect(results).toHaveLength(40);
    } finally {
      dom.window.close();
    }
  });

  it('distinguishes undefined direction and unknown masks from justified target inheritance', () => {
    const dom = openExample();
    try {
      expect(dom.window.eval('target(original.map(r=>r.map(()=>0)),"direction")')).toBe(
        'Undefined',
      );
      expect(dom.window.eval('target(original.map(r=>r.map(()=>100)),"presence")')).toBe(
        'Outside toy domain',
      );
      expect(
        dom.window.eval('inspect(transform(original,true,false,100),"presence",100).status'),
      ).toBe('valid');
      expect(
        dom.window.eval('inspect(transform(original,true,false,100),"direction",100).status'),
      ).toBe('invalid');
    } finally {
      dom.window.close();
    }
  });

  it('changes task and contrast, keeps resize state, and resets to the static preview', () => {
    const dom = openExample();
    try {
      const task = dom.window.document.querySelector('#task');
      task.value = 'direction';
      task.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Right → Left. Copy original label: invalid.',
      );
      const contrast = dom.window.document.querySelector('#contrast');
      contrast.value = '0';
      contrast.dispatchEvent(new dom.window.Event('input', { bubbles: true }));
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Right → Undefined. Copy original label: unsupported.',
      );
      dom.window.dispatchEvent(new dom.window.Event('resize'));
      expect(contrast.value).toBe('0');
      dom.window.document.querySelector('#reset').click();
      expect(task.value).toBe('presence');
      expect(contrast.value).toBe('100');
      expect(dom.window.document.querySelector('#horizontal').checked).toBe(true);
      expect(dom.window.document.querySelector('#vertical').checked).toBe(false);
      expect(dom.window.document.querySelector('output').textContent).toContain(
        'Arrow present → Arrow present. Copy original label: valid.',
      );
      expect(dom.window.document.querySelector('#statistics').textContent).toContain(
        '12/64 pixels changed; 26 foreground pixels remain.',
      );
    } finally {
      dom.window.close();
    }
  });

  it('verifies continuous-edge box coordinates, dimensions, and flip involution', () => {
    const { width, original, flipped } = reference.example.box_example;
    const flip = ([left, top, right, bottom]: number[]) => [
      width - right,
      top,
      width - left,
      bottom,
    ];
    expect(flip(original)).toEqual([70, 10, 90, 40]);
    expect(flip(original)).toEqual(flipped);
    expect(flip(flipped)).toEqual(original);
    expect(flipped[2] - flipped[0]).toBe(20);
    expect(flipped[3] - flipped[1]).toBe(30);
  });

  it('integrates the fixed structure, sources, metadata, responsive illustration, and explorer', async () => {
    const corpus = await loadAndCompileCorpus(
      {
        manifestPath: resolve(root, 'patternverse.yaml'),
        contentDirectory: resolve(root, 'content'),
        readonly: true,
      },
      { includeDrafts: false },
    );
    expect(corpus.diagnostics.filter((d) => d.severity === 'error')).toEqual([]);
    const article = corpus.entities.find((e) => e.id === 'ml-label-preserving-augmentation')!;
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
    expect(rendered).toContain('/assets/machine-learning/label-preserving-augmentation.svg');
    expect(rendered).toContain('/assets/machine-learning/label-preserving-augmentation-mobile.svg');
    expect(rendered).toContain('data-article-widget');
    const md = readFileSync(
      resolve(root, 'content/patterns/ml-label-preserving-augmentation.md'),
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
